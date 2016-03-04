var uuid = require('./uuid');
var timestamp = require('./timestamp');
var _ = require('./utils');

var example = exports.example = {
  type: 'messages',
  id: 'message123',
  attributes: {
    audio_url: 'http://go.peppermint.com/abc/xyz.m4a',
    sender_email: 'bob@example.com',
    recipient_email: 'ann@example.com',
    sender_name: 'Bob',
    created: '2015-10-19 09:19:55',
    duration: 6,
    transcription: 'Hello Ann',
    read: '2015-10-19 09:22:03',
  },
};

var attributesSchema = {
  type: 'object',
  properties: {
    audio_url: {type: 'string', pattern: '^http://go.peppermint.com'},
    sender_email: {type: 'string'},
    recipient_email: {type: 'string'},
    sender_name: {type: 'string'},
    created: timestamp,
    duration: {type: 'number'},
    transcription: {type: 'string'},
    transcription_url: {type: 'string'},
    read: timestamp,
  },
  additionalProperties: false,
};

exports.schema = _.resourceObjectSchema('messages', attributesSchema);
exports.requestSchema = _.adapt(_.resourceObjectSchema('messages', _.adapt(attributesSchema, ['transcription_url'], ['audio_url', 'sender_email', 'recipient_email'])), [], ['type', 'attributes']);
var responseSchema = _.adapt(_.resourceObjectSchema('messages', _.adapt(attributesSchema, ['duration', 'transcription', 'read'], ['audio_url', 'sender_email', 'recipient_email', 'sender_name', 'created'])), [], ['id', 'type', 'attributes']);

exports.responseSchema = _.jsonapi(responseSchema);

var collectionExample = {
  links: {next: 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/messages?recipient=recipient123&since=2015-10-19%2009%3A19%3A55'},
  data: [example, _.assign({}, example, {id: 'message2'})],
};

exports.collection = {
  schema: _.jsonapi(_.resourceCollectionSchema(responseSchema), _.adapt(_.linksSchema, [], ['next'])),
 example: collectionExample,
};
