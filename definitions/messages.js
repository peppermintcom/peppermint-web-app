var uuid = require('./uuid');
var timestamp = require('./timestamp');
var _ = require('./utils');

var example = exports.example = {
  type: 'messages',
  id: 'message123',
  attributes: {
    audio_url: 'http://go.peppermint.com/xyz.m4a',
    sender_email: 'bob@example.com',
    sender_name: 'Bob',
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
    sender_name: {type: 'string'},
    recipient_email: {type: 'string'},
    created: timestamp,
    duration: {type: 'number'},
    transcription: {type: 'string'},
  },
  required: ['audio_url', 'sender_email', 'recipient_email', 'created', 'duration'],
  additionalProperties: false,
};

exports.schema = _.resourceObjectSchema('messages', attributesSchema);

var reqSchema = _.resourceObjectSchema('messages', _.adapt(attributesSchema, ['transcription_url'], ['audio_url', 'sender_email', 'recipient_email']));

delete reqSchema.properties.id;
delete reqSchema.properties.relationships;
reqSchema.required = ['type', 'attributes'];
exports.schemaRequest = reqSchema;

var collectionSchema = _.resourceCollectionSchema('messages', attributesSchema);
var collectionExample = {
  links: {next: 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/messages?recipient=recipient123&since=2015-10-19%2009%3A19%3A55'},
  data: [example, _.assign({}, example, {id: 'message2'})],
};

exports.collection = {
  schema: collectionSchema,
  example: collectionExample,
};
