var timestamp = require('./timestamp2');
var _ = require('./utils');

var example = {
  type: 'uploads',
  id: 'upload123',
  attributes: {
    canonical_url: 'http://go.peppermint.com/abc/xyz.m4a',
    secure_url: 'https://duw3fm6pm35xc.cloudfront.net/abc/xyz.m4a',
    created: '2015-10-10 22:10:10',
    is_complete: true,
    duration: 15,
    transcription: 'hello',
    sender_name: 'Satoshi',
    sender_email: 'satoshi@example.com',
  },
};

var attributesSchema = {
  type: 'object',
  properties: {
    canonical_url: {type: 'string', pattern: '^http://go.peppermint.com/'},
    secure_url: {type: 'string', description: 'The audio file served over https. At some point in the future this will be the same as the canonical_url.'},
    created: timestamp,
    is_complete: {type: 'boolean', description: 'True iff the audio has finished uploading.'},
    duration: {type: 'number', description: 'Length of the audio in seconds.'},
    transcription: {type: 'string', description: 'Text of the transcription.'},
    sender_name: {type: 'string'},
    sender_email: {type: 'string'},
  },
  additionalProperties: false,
};

exports.schema = _.resourceObjectSchema('uploads', attributesSchema);

var responseSchema = _.adapt(_.resourceObjectSchema('uploads', _.adapt(attributesSchema, ['sender_name', 'sender_email', 'duration', 'transcription'], ['canonical_url', 'secure_url', 'is_complete', 'created'])), [], ['id', 'type', 'attributes']);

exports.responseSchema = _.jsonapi(responseSchema);

var collectionExample = {
  data: [example],
};

exports.collection = {
  schema: _.jsonapi(_.resourceCollectionSchema(responseSchema)),
  example: collectionExample,
};
