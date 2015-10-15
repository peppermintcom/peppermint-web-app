var tv4 = require('tv4');
var schema = require('./spec').parameters[0].schema;
var _ = require('utils');

/**
 * Registers a new instance of an app. The app can be identified by the API key
 * provided in the payload.
 */
exports.handler = function(e, context) {
  var isValid = tv4.validate(e, schema);

  if (!isValid) {
    context.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }
  //generate key (password)
  var key = _.token(40);
  var hash = _.bcryptHash(key);

  _.bcryptHash(key)
    .then(function(hash) {
      return _.db.execRow('create_recorder', [
          e.api_key,
          e.recorder.recorder_client_id,
          hash,
          e.recorder.description
        ])
        .then(function(r) {
          //TODO generate JWT
          var jwt = '';

          context.succeed({
            at: jwt,
            recorder: {
              recorder_id: r._id,
              recorder_client_id: e.recorder.recorder_client_id,
              recorder_key: key,
              recorder_ts: r._ts,
              description: e.recorder.description,
            },
          });
        })
        .catch(function(err) {
          if (err.code === '23505' && /recorder_client_id/.test(err.detail)) {
            context.fail('Conflict: recorder_client_id');
            return;
          }
          if (err.code === 'P0002' && /api_key/.test(err.message)) {
            context.fail('Unauthorized: ' + err.message);
            return;
          }
          throw err;
        });
  })
  .catch(function(err) {
    console.log(err);
    context.fail('Internal Server Error');
  });
};
