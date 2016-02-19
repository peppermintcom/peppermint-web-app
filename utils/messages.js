/*
 * message_id: string uuid
 * audio_url: http://go.peppermint.com/ + key
 * sender_email: string
 * recipient_email: string
 * created: number, non-null
 * handled: number time
 * handled_by: enum
 * outcome: gcm_response if sent, otherwise enum (drop_reason)
 */
var dynamo = require('./dynamo');
var timestamp = require('./timestamp');
var token = require('./randomtoken');
var _ = require('lodash');

//adds id and created properties and formats a message
exports.create = function(message) {
  return _.assign({message_id: token(22), created: Date.now()}, message, {
    sender_email: message.sender_email.toLowerCase(),
    recipient_email: message.recipient_email.toLowerCase(),
  });
};

//saves the message to the database
exports.put = function(message) {
  return dynamo.put('messages', format(message));
};

exports.get = function(messageID) {
  return dynamo.get('messages', {message_id: {S: messageID}}).then(parse);
};

exports.update = function(messageID, expr, values) {
  return dynamo.update('messages', {message_id: {S: messageID}}, expr, values);
};

var queryAudioURL = exports.queryAudioURL = function(audioURL) {
  return new Promise(function(resolve, reject) {
    dynamo.query({
      TableName: 'messages',
      IndexName: 'audio_url-index',
      //"account_id = :account_id"
      KeyConditionExpression: 'audio_url = :audio_url',
      ExpressionAttributeValues: {
        ':audio_url': {S: audioURL},
      },
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(_.map(data.Items, parse));
    });
  });
};

var del = exports.del = function(messageID) {
  return dynamo.del('messages', {message_id: {S: messageID}});
};

exports.delByAudioURL = function(audioURL) {
  return queryAudioURL(audioURL)
    .then(function(messages) {
      return Promise.all(_.map(messages, function(message) {
        return del(message.message_id);
      }));
    });
};

//converts from plain object to dynamo format
function format(message) {
  var msg = {
    message_id: {S: message.message_id},
    audio_url: {S: message.audio_url},
    sender_email: {S: message.sender_email.toLowerCase()},
    recipient_email: {S: message.recipient_email.toLowerCase()},
    created: {N: message.created.toString()},
  };

  if (message.handled) {
    msg.handled = {N: message.handled.toString()};
  }
  if (message.handled_by) {
    msg.handled_by = {S: message.handled_by};
  }
  if (message.outcome) {
    msg.outcome = {S: message.outcome};
  }

  return msg;
}

//converts from dynamo item to plain object
function parse(item) {
  if (!item) return null;

  return {
    message_id: item.message_id.S,
    audio_url: item.audio_url.S,
    sender_email: item.sender_email.S,
    recipient_email: item.recipient_email.S,
    created: +item.created.N,
    handled: item.handled && +item.handled.N,
    handled_by: item.handled_by && item.handled_by.S,
    outcome: item.outcome && item.outcome.S,
  };
}

exports.resource = function(message) {
  if (!message) return null;

  var attrs = {
    audio_url: message.audio_url,
    sender_email: message.sender_email,
    recipient_email: message.recipient_email,
    created: timestamp(message.created),
    duration: message.duration,
  };

  if (message.transcription_url) {
    attrs.transcription_url = message.transcription_url;
  }

  return {
    type: 'messages',
    id: message.message_id,
    attributes: attrs,
  };
};

//identity of the code that tries to send the message to GCM
exports.handlers = {
  POSTPROCESSING: 'lambda:Postprocessing',
  CREATE_MESSAGE: 'lambda:CreateMessage',
};

//reason why message was not forwarded to gcm for delivery
exports.drop_reason = {
  NO_SENDER: 'no account found with sender email',
  NO_RECIPIENT: 'no account found with recipient email',
  NO_RECEIVER: 'recipient does not have any recorders linked to their account as a receiver',
  NO_GCM_REGISTRATION_TOKEN: 'recipient does not have any receivers with a gcm_registration_token',
};
