var http = require('./http');
var conf = require('./conf');
var recorders = require('./recorders');
var messages = require('./messages');
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

/*
 * Format each message for delivery to a client. iOS produces 2 push
 * notifications for each message. Resolves to a list of objects with a
 * formatted message property ready to pass to GCM and a recorder property
 * representing the device the message is addressed to.
 */

function formatter(recorder) {
  if (apps.isAndroid(recorder.api_key)) {
    return android;
  } else if (recorder.api_key === 'ios-dev') {
    return iOSDev;
  } else {
    return iOS;
  }
}

function format(receivers, message, sender) {
  return Promise.all(_.map(_.map(receivers, formatter), function(formatter, i) {
    return formatter(message, receivers[i].gcm_registration_token, sender.full_name)
      .then(_.partial(bindToRecorder, receivers[i]));
  }))
  .then(_.flatten);
}

function bindToRecorder(recorder, messages) {
  return _.map(messages, function(message) {
    return {
      recorder: recorder,
      message: message,
    };
  });
}

exports.deliver = function (receivers, message, sender) {
  //gets send stub in dev environment
  var send = this.send;
  var success = 0;

  return format(receivers, message, sender)
    .then(function(messages) {
      return Promise.all(_.map(messages, function(message) {
        return send(message.message);
      }))
      .then(function(results) {
        return Promise.all(_.map(results, function(result, i) {
          success += result.success;

          return sync([messages[i].recorder], result);
        }));
      })
    })
    .then(function() {
      return success;
    });
};

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
  return Promise.resolve([{
    to: to,
    priority: 'high',
    content_available: true,
    data: data(message, from_name),
  }]);
}

function iOSDev(message, to, from_name) {
  return messages.recentUnreadCount(message.recipient_email, message.message_id)
    .then(function(count) {
      return [{
        to: to,
        priority: 'high',
        notification: {
          badge : count.toString(),
          sound : 'notification.aiff',
          title: 'You have a new message',
          body: (from_name || message.sender_email) + ' sent you a message',
          click_action : 'AudioMessage',
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
    });
}

function android(message, to, from_name) {
  return Promise.resolve([{
    to: to,
    priority: 'high',
    data: data(message, from_name),
  }]);
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
