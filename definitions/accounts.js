var timestamp = require('./timestamp');
var _ = require('./utils');

exports.example = {
  type: 'accounts',
  id: 'account123',
  attributes: {
    email: 'john@example.com',
    full_name: 'John Doe',
    registration_ts: '2015-10-19 09:19:55',
    is_verified: false,
  },
};

var attributesSchema = {
  type: 'object',
  properties: {
    email: {type: 'string'},
    full_name: {type: 'string'},
    registration_ts: timestamp,
    is_verified: {type: 'boolean'},
  },
  required: ['email', 'full_name', 'registration_ts', 'is_verified'],
  additionalProperties: false,
};

exports.schema = _.resourceObjectSchema('accounts', attributesSchema);
