var http = require('./http');
var conf = require('./conf');
var recorders = require('./recorders');
var messages = require('./messages');
var notices = require('./notices');
var _ = require('lodash');
var apps = require('./apps');
var timestamp = require('./timestamp');

//publishes a notice to gcm weird if status code response is not 200. There may
//be other unhandled errors with a 200 status code. Sync will publish a notice
//for those.
var send = exports.send = function(message) {
  return http.postJSON('https://gcm-http.googleapis.com/gcm/send', message, {
    Authorization: 'key=' + conf.PEPPERMINT_GCM_API_KEY,
  }).then(function(res) {
    if (res.statusCode != 200) {
      return notices.gcmWeird(res.body, res.statusCode)
        .then(function() {
          throw new Error(res.statusCode);
        });
    }
    return res.body;
  })
};

/*
 * Format each message for delivery to a client. iOS produces 2 push
 * notifications for each message. Resolves to a list of objects with a
 * formatted message property ready to pass to GCM and a recorder property
 * representing the device the message is addressed to.
 */

function formatter(recorder) {
  if (apps.isiOS(recorder.api_key)) {
    return iOS;
  }
  return android;
}

function format(receivers, message) {
  return Promise.all(_.map(_.map(receivers, formatter), function(formatter, i) {
    return formatter(message, receivers[i].gcm_registration_token)
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

exports.deliver = function (receivers, message) {
  //gets send stub in dev environment
  var send = this.send;
  var success = 0;

  return format(receivers, message)
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

//Format the message for delivery to each receiver. Send to GCM. Update database
//to clear or replace invalid gcm registration ids. Return all the data.
exports.deliver2 = function (receivers, message) {
  return format(receivers, message)
    .then(function(messages) {
      //messages is an array of {recorder, message} objects
      return Promise.all(_.map(messages, function(message) {
        return send2(message.message);
      }))
      .then(function(results) {
        //results is an array of {body, statusCode, header} responses from GCM API
        return Promise.all(_.map(results, function(result, i) {
          return sync([messages[i].recorder], result.body);
        }))
        .then(function(changes) {
          return results.map(function(result, i) {
            return Object.assign(result, {
              sync: changes[i],
              payload: messages[i],
            });
          });
        });
      });
    });
};

function data(message) {
  return {
    audio_url: message.audio_url,
    message_id: message.message_id,
    sender_name: message.sender_name,
    sender_email: message.sender_email,
    recipient_email: message.recipient_email,
    created: timestamp(message.created),
    transcription: message.transcription,
    duration: message.duration,
  };
}

function iOS(message, to) {
  return messages.recentUnreadCount(message.recipient_email, message.message_id)
    .then(function(count) {
      return [{
        to: to,
        priority: 'high',
        notification: {
          badge : count.toString(),
          sound : 'notification.aiff',
          title: 'You have a new message',
          body: (message.sender_name || message.sender_email) + ' sent you a message',
          click_action : 'AudioMessage',
          sender_name: message.sender_name,
          sender_email: message.sender_email,
          created: timestamp(message.created),
        },
      }];
    });
}

function android(message, to) {
  return Promise.resolve([{
    to: to,
    priority: 'high',
    data: data(message),
  }]);
}

//update database for invalid tokens. Returns the changes applied. The results
//argument is the response body received from the GCM API.
var sync = exports.sync = function(recorders, results) {
  if (results.failure || results.canonical_ids) {
    return Promise.all(_.map(results.results, function(r, i) {
      if (r.message_id && r.registration_id) {
        return changeToken(recorders[i], r.registration_id);
      }
      if (r.error && /InvalidRegistration|NotRegistered/.test(r.error)) {
        return deleteToken(recorders[i]);
      }
      return Promise.resolve(null);
    }));
  }
  return Promise.resolve(null);
};

function deleteToken(recorder) {
  return recorders.update(recorder.client_id, 'REMOVE gcm_registration_token')
    .then(function() {
      return 'DELETE TOKEN';
    });
};

function changeToken(recorder, newToken) {
  return recorders.update(recorder.client_id, 'SET gcm_registration_token = :token', {
    ':token': {S: newToken},
  })
  .then(function() {
    return 'CHANGE TOKEN';
  })
}
