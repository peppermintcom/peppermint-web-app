var dynamo = require('./dynamo');
var timestamp = require('./timestamp');
var token = require('./randomtoken');
var _ = require('lodash');

exports.create = function(message) {
  var created = Date.now();
  var msg = _.assign({message_id: token(22), created: created}, message);

  var m = format(msg);

  return dynamo.put('messages', m)
    .then(function() {
      return parse(m);
    });
};

//converts from plain object to dynamo format
function format(message) {
  return {
    message_id: {S: message.message_id},
    audio_url: {S: message.audio_url},
    sender_email: {S: message.sender_email.toLowerCase()},
    recipient_email: {S: message.recipient_email.toLowerCase()},
    created: {N: message.created.toString()},
  };
}

//converts from dynamo item to plain object
function parse(item) {
  return {
    message_id: item.message_id.S,
    audio_url: item.audio_url.S,
    sender_email: item.sender_email.S,
    recipient_email: item.recipient_email.S,
    created: timestamp(+item.created.N),
  };
}
