var _ = require('utils');
var spec = require('./spec');

exports.handler = _.middleware.process([
  _.middleware.isjsonapi,
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  _.middleware.validateBody(spec),
  allow,
  handle
]);

//checks the token's recorder_id matches the path param and data.id property
function allow(request, reply) {
  if (!request.jwt.recorder_id) {
    reply.fail({
      status: '401',
      detail: 'Auth token is not valid for any recorder',
    });
    return;
  }
  if (request.recorder_id !== request.jwt.recorder_id) {
    reply.fail({
      status: '403',
      detail: 'Auth token is not valid for recorder ' + request.recorder_id,
    });
    return;
  }
  if (request.recorder_id !== request.body.data.id) {
    reply.fail({
      status: '403',
      detail: 'Auth token is not valid for recorder ' + request.body.data.id,
    });
    return;
  }
  reply.succeed(request);
}

function handle(request, reply) {
  var newToken = request.body.data.attributes.gcm_registration_token;
  var oldToken;

  _.recorders.getByID(request.recorder_id)
    .then(function(recorder) {
      oldToken = recorder.gcm_registration_token;

      //TODO OPTIMIZATION can updateItem return an old value?
      //TODO OPTIMIZATION update by client_id since it's known here
      return Promise.all([
        _.receivers.accounts(recorder.recorder_id),
        _.recorders.update(request.recorder_id, {
          gcm_registration_token: {S: newToken},
        })
      ]);
    })
    .then(function(results) {
      var accounts = results[0];

      return Promise.all(accounts.map(function(account) {

        //If this recorder is a receiver for an account and the account has a device
        //group:
        //1. add the newToken to the device group
        //2. if there is an oldToken, remove it from the device group
        if (account.gcm_notification_key) {
          return _.gcm.addDeviceGroupMember(account.email, account.gcm_notification_key, newToken)
            .then(function() {
              if (oldToken) {
                return _.gcm.removeDeviceGroupMember(account.email, account.gcm_notification_key, oldToken);
              }
            });
        }

        //If this recorder is a receiver for an account and the account does not
        //have a device group:
        //1. create a device group for the account using newToken
        return _.gcm.createDeviceGroup(account.email, newToken);

        //If this recorder is not a receiver for an account do nothing with gcm
      }));
    })
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      console.log(err);
      console.log(err.stack);
      reply.fail(err);
    });
}
