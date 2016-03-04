/*
 * message_id: string uuid
 * audio_url: http://go.peppermint.com/ + key
 * sender_email: string
 * sender_name: string
 * recipient_email: string
 * created: number, non-null
 * handled: number time
 * handled_by: enum
 * outcome: gcm_response if sent, otherwise enum (drop_reason)
 */
var dynamo = require('./dynamo');
var timestamp = require('./timestamp');
var token = require('./randomtoken');
var uploads = require('./uploads');
var transcriptions = require('./transcriptions');
var _ = require('lodash');

var LIMIT = exports.LIMIT = 40;
//when fetching unread messages, only check from the past month
var UNREAD_TERM = 1000 * 60 * 60 * 24 * 30;

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

exports.update = function(messageID, expr, values, names, condition) {
  return dynamo.update('messages', {message_id: {S: messageID}}, expr, values, names, condition);
};

var queryAudioURL = exports.queryAudioURL = function(audioURL) {
  return dynamo.queryAll({
    TableName: 'messages',
    IndexName: 'audio_url-index',
    KeyConditionExpression: 'audio_url = :audio_url',
    ExpressionAttributeValues: {
      ':audio_url': {S: audioURL},
    },
  })
  .then(function(messages) {
    return _.map(messages, parse);
  });
};

//mutates the message argument
function attachDuration(message) {
  return uploads.getByURL(message.audio_url)
    .then(function(upload) {
      message.duration = upload && upload.seconds;

      return message;
    });
}

//mutates the message argument
function attachTranscription(message) {
  return transcriptions.getByAudioURL(message.audio_url)
    .then(function(transcription) {
      message.transcription = transcription && transcription.text;

      return message;
    });
}

//mutates the message argument
exports.expand = function(message) {
  return Promise.all([
    attachDuration(message),
    attachTranscription(message),
  ])
  .then(function() {
    return message;
  });
};

/**
 * query messages using either the recipient or sender email index sorted by
 * created time.
 * @param {String} role - either "recipient" or "sender"
 * @param {String} email
 * @param {Number} since - only find messages created after this time
 * @return {Promise} resolves to an object where Items field is a list of parsed
 * message objects
 */
function queryEmail(role, email, since) {
  since = since || 0;

  return new Promise(function(resolve, reject) {
    //'recipient_email'
    var primary = role + '_email';
    var values = {
      ':since': {N: since.toString()},
      //:recipient_email: {S: email},
    };
    values[':' + primary] = {S: email.toLowerCase()};

    dynamo.query({
      TableName: 'messages',
      //"recipient_email-created-index"
      IndexName: role + '_email-created-index',
      //"recipient_email = :recipient_email AND created > :since"
      KeyConditionExpression: primary + ' = :' + primary + ' AND created > :since',
      ExpressionAttributeValues: values,
      Limit: LIMIT,
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        messages: _.map(data.Items || [], parse),
        cursor: data.LastEvaluatedKey && +data.LastEvaluatedKey.created.N,
      });
      if (data.LastEvaluatedKey) {
        request.last = +data.LastEvaluatedKey.created.N;
      }
      data.Items = _.map(data.Items || [], parse);
      resolve(data);
    });
  });
}

exports.queryRecipient = _.partial(queryEmail, 'recipient');
exports.querySender = _.partial(queryEmail, 'sender');

function unread(recipientEmail, since) {
  return dynamo.queryAll({
    TableName: 'messages',
    IndexName: 'recipient_email-created-index',
    KeyConditionExpression: 'recipient_email = :recipient_email AND created > :since',
    FilterExpression: 'attribute_not_exists(#read)',
    ExpressionAttributeValues: {
      ':recipient_email': {S: recipientEmail},
      ':since': {N: since.toString()},
    },
    ExpressionAttributeNames: {
      '#read': 'read',
    },
  })
  .then(function(messages) {
    return _.map(messages, parse);
  });
}

var recentUnread = exports.recentUnread = function(recipientEmail) {
  return unread(recipientEmail, Date.now() - UNREAD_TERM);
};

/*
 * This query operation is not strongly consistent. If the recent unread result
 * set does not contain messageID then increment the count.
 */
exports.recentUnreadCount = function(recipientEmail, messageID) {
  return recentUnread(recipientEmail).then(function(messages) {
    var adjustment = 0;

    if (messageID) {
      var has = _.find(messages, function(message) {
        return message.message_id === messageID;
      });
      if (!has) adjustment++;
    }

    return messages.length + adjustment;
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

  if (message.sender_name) {
    msg.sender_name = {S: message.sender_name};
  }
  if (message.handled) {
    msg.handled = {N: message.handled.toString()};
  }
  if (message.handled_by) {
    msg.handled_by = {S: message.handled_by};
  }
  if (message.outcome) {
    msg.outcome = {S: message.outcome};
  }
  if (message.read) {
    msg.read = {N: message.read.toString()};
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
    sender_name: item.sender_name && item.sender_name.S,
    recipient_email: item.recipient_email.S,
    created: +item.created.N,
    handled: item.handled && +item.handled.N,
    handled_by: item.handled_by && item.handled_by.S,
    outcome: item.outcome && item.outcome.S,
    read: item.read && +item.read.N,
  };
}

exports.resource = function(message) {
  if (!message) return null;

  var attrs = {
    audio_url: message.audio_url,
    sender_email: message.sender_email,
    sender_name: message.sender_name,
    recipient_email: message.recipient_email,
    created: timestamp(message.created),
  };

  if (message.duration) {
    attrs.duration = message.duration;
  }
  if (message.transcription_url) {
    attrs.transcription_url = message.transcription_url;
  }
  if (message.transcription) {
    attrs.transcription = message.transcription;
  }
  if (message.read) {
    attrs.read = timestamp(message.read);
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
