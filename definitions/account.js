var _ = require('utils');
var timestamp = require('./timestamp');
var uuid = require('./uuid');

module.exports = {
  title: 'Account',
  description: 'An Account represents a human user of an app. An account can be related to multiple recorders.',
  type: 'object',
  properties: {
    account_id: uuid,
    email: {
      type: 'string',
    },
    password: {
      type: 'string',
    },
    full_name: {
      type: 'string',
    },
    registration_ts: timestamp,
    is_verified: {
      type: 'boolean',
    },
  },
};
