var tv4 = require('tv4');
var bcrypt = require('bcrypt-nodejs');
var schema = require('./spec').parameters[0].schema;
var _ = require('utils');

/**
 * Registers a new instance of an app. The app can be identified by the API key
 * provided in the payload.
 * 1. Get app id from apps table by api key.
 * 2. Generate password (key) for recorder.
 * 3. Timestamp.
 * 4. Save app id, client id, timestamp, description, bcrypted key in database
 * and get recorder id.
 * 5. Generate JWT.
 * 6. Return JWT, recorder id, client id, plaintext key, timestamp, description
 * in response.
 */
exports.handler = function(e, context) {
  var isValid = tv4.validate(e, schema);

  if (!isValid) {
    context.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }
  //generate key (password)
  var key = _.token(40);

  //stub
  context.succeed({
    at: 'abc.def.ghi',
    recorder: {
      recorder_id: 1234567890,
      user_account_id: 2345678901,
      recorder_client_id: e.recorder.recorder_client_id,
      recorder_key: 'abcDEF123',
      recorder_ts: '2015-10-19 09:19:55',
      description: e.recorder.description,
    },
  });
};
