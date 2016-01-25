var uuid = require('./uuid');
var timestamp = require('./timestamp');
var _ = require('./utils');

exports.example = {
  type: 'messages',
  id: 'message123',
  attributes: {
    audio_url: 'http://go.peppermint.com/xyz.m4a',
    transcription_url: 'http://go.peppermint.com/xyz.txt',
    sender_email: 'bob@example.com',
    recipient_email: 'ann@example.com',
    created: '2015-10-19 09:19:55',
  },
};

var attributesSchema = {
  type: 'object',
  properties: {
    audio_url: {type: 'string'},
    transcription_url: {type: 'string'},
    sender_email: {type: 'string'},
    recipient_email: {type: 'string'},
    created: timestamp,
  },
  required: ['audio_url', 'sender_email', 'recipient_email', 'created'],
  additionalProperties: false,
};

exports.schema = _.resourceObjectSchema('messages', attributesSchema);
exports.schemaRequest = _.resourceObjectSchema('messages', _.adapt(attributesSchema, ['transcription_url'], ['audio_url', 'sender_email', 'recipient_email']));
