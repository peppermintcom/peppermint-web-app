var id = require('./id');
var timestamp = require('./timestamp');

module.exports = {
  type: 'object',
  properties: {
    recorder_id: id,
    user_account_id: id,
    recorder_client_id: {type: 'string'},
    recorder_key: {type: 'string'},
    recorder_ts: timestamp,
    description: {type: 'string'},
  },
  required: ['recorder_client_id'],
};
