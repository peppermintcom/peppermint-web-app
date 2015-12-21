var uuid = require('./uuid');
var timestamp = require('./timestamp');

exports.title = 'AudioMessage';
exports.description = 'An audio recording shared between two email addresses.';
exports.type = 'object';
exports.properties = {
  'message_id': uuid,
  'audio_url': {type: 'string'},
  'transcription_url': {type: 'string'},
  'sender_email': {type: 'string'},
  'recipient_email': {type: 'string'},
  'created': timestamp,
};
