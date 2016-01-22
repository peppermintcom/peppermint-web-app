var timestamp = require('./timestamp');
var _ = require('./utils');

exports.example = {
  type: 'recorders',
  id: 'recorder123',
  attributes: {
    recorder_client_id: 'someclient123',
    recorder_key: 'abcDEF123',
    recorder_ts: '2015-10-19 09:19:55',
    description: 'Android 4.1 Nexus 5',
    gcm_registration_token: 'gcm123',
  },
};

var attributesSchema = {
  type: 'object',
  properties: {
    recorder_client_id: {type: 'string'},
    recorder_key: {type: 'string'},
    recorder_ts: timestamp,
    description: {type: 'string'},
    gcm_registration_token: {type: 'string'},
  },
  required: ['recorder_client_id', 'recorder_key', 'recorder_ts'],
  additionalProperties: false,
};
var attributesSchemaNoKey = {
  type: 'object',
  properties: {
    recorder_client_id: {type: 'string'},
    recorder_ts: timestamp,
    description: {type: 'string'},
  },
  required: ['recorder_client_id', 'recorder_ts'],
  additionalProperties: false,
};

exports.schema = _.resourceObjectSchema('recorders', attributesSchema);
exports.schemaNoKey = _.resourceObjectSchema('recorders', attributesSchemaNoKey);
exports.schemaGCM = _.resourceObjectSchema('recorders', _.adapt(attributesSchema, [], ['gcm_registration_token']));
