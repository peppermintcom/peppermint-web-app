var http = require('./http');
var conf = require('./conf');
var recorders = require('./recorders');
var _ = require('lodash');
var apps = require('./apps');
var timestamp = require('./timestamp');

var send = exports.send = function(message) {
  return http.postJSON('https://gcm-http.googleapis.com/gcm/send', message, {
    Authorization: 'key=' + conf.PEPPERMINT_GCM_API_KEY,
  }).then(function(res) {
    console.log('GCM Response:');
    console.log(res.statusCode);
    console.log(res.headers);
    console.log(res.body);
    if (res.statusCode != 200) {
      throw new Error(res.statusCode);
    }
    return res.body;
  });
};

exports.deliver = function (receivers, message, sender) {
  var send = this.send;
  var queue = [];
  var success = 0;

  _.each(receivers, function(recorder) {
    var formatter;

    if (apps.isAndroid(recorder.api_key)) {
      formatter = android;
    } else if (recorder.api_key === 'ios-dev') {
      formatter = iOSDev;
    } else {
      formatter = iOS;
    }

    var formats = formatter(message, recorder.gcm_registration_token, sender.full_name);
 
    _.each(formats, function(formattedMsg) {
      queue.push({
        recorder: recorder,
        message: formattedMsg,
      });
    });
  });

  return Promise.all(_.map(queue, function(message) {
      return send(message.message);
    }))
    .then(function(results) {

      return Promise.all(_.map(results, function(result, i) {
        success += result.success;

        return sync([queue[i].recorder], result);
      }));
    })
    .then(function() {
      return success;
    });
}

function data(message, from_name) {
  return {
    audio_url: message.audio_url,
    message_id: message.message_id,
    sender_name: from_name,
    sender_email: message.sender_email,
    recipient_email: message.recipient_email,
    created: timestamp(message.created),
    transcription: message.transcription,
    duration: message.duration,
  };
}

function iOS(message, to, from_name) {
  return [{
    to: to,
    priority: 'high',
    content_available: true,
    data: data(message, from_name),
  }];
}

function iOSDev(message, to, from_name) {
  return [{
    to: to,
    priority: 'high',
    notification: {
      badge : "1",
      sound : "notification.aiff",
      body : "Message Content",
      title : "Message Title",
      click_action : "AudioMessage",
      sender_name: from_name,
      sender_email: message.sender_email,
      created: timestamp(message.created),
    },
  },
  {
    to: to,
    priority: 'high',
    data: {
      recipient_email: message.recipient_email,
      audio_url: message.audio_url,
      sender_name: from_name,
      sender_email: message.sender_email,
      created: timestamp(message.created),
      duration : message.duration,
      message_id : message.message_id,
      transcription: message.transcription,
    },
  }];
}

function android(message, to, from_name) {
  return [{
    to: to,
    priority: 'high',
    data: data(message, from_name),
  }];
}
//update database for invalid tokens
var sync = exports.sync = function(recorders, results) {
  if (results.failure || results.canonical_ids) {
    return Promise.all(_.map(results.results, function(r, i) {
      if (r.message_id && r.registration_id) {
        return changeToken(recorders[i], r.registration_id);
      }
      if (r.error) {
        if (/InvalidRegistration|NotRegistered/.test(r.error)) {
          return deleteToken(recorders[i]);
        }
        //Unavailable could be retried
      }
      return Promise.resolve();
    }));
  }
  return Promise.resolve();
};

function deleteToken(recorder) {
  return recorders.update(recorder.client_id, 'REMOVE gcm_registration_token');
};

function changeToken(recorder, newToken) {
  return recorders.update(recorder.client_id, 'SET gcm_registration_token = :token', {
    ':token': {S: newToken},
  });
}
