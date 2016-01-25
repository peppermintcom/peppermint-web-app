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
  //JWT includes a recorderID
  if (!request.jwt.recorder_id) {
    reply.fail({
      status: '401',
      detail: 'Auth token is not valid for any recorder',
    });
    return;
  }
  //JWT includes an accountID
  if (!request.jwt.account_id) {
    reply.fail({
      status: '401',
      detail: 'Auth token is not valid for any account',
    });
    return;
  }
  //path param accountID matches JWT's accountID
  if (request.account_id !== request.jwt.account_id) {
    reply.fail({
      status: '403',
      detail: 'Auth token is not valid for account ' + request.account_id,
    });
    return;
  }
  //JWT's recorderID matches the body's recorderID
  if (request.jwt.recorder_id !== request.body.data[0].id) {
    reply.fail({
      status: '403',
      detail: 'Auth token is not valid for recorder ' + request.body.data[0].id,
    });
    return;
  }
  reply.succeed(request);
}

function handle(request, reply) {
  Promise.all([
      _.accounts.getByID(request.jwt.account_id),
      _.recorders.getByID(request.jwt.recorder_id),
    ])
    .then(function(results) {
      var account = results[0];
      var recorder = results[1];
      var link = function() {
        return _.dynamo.put('receivers', {
          recorder_id: {S: recorder.recorder_id},
          account_id: {S: account.account_id},
        });
      };

      //recorder not yet registered with GCM
      //link recorder and account in receivers table so if the recorder
      //registers with GCM it will start receiving messages for the account
      if (!recorder.gcm_registration_token) {
        return link();
      }

      //account does not have an associated GCM Device Group
      //Create a new GCM Device Group with one member
      if (!account.gcm_notification_key) {
        return _.gcm.createDeviceGroup(account.email, recorder.gcm_registration_token)
          .then(function(result) {
            return Promise.all([
                _.accounts.update(account.email, {gcm_notification_key: {S: result.notification_key}}),
                link(),
              ]);
          });
      }

      //recorder is registered with GCM and account has a GCM Device Group
      //Add recorder to GCM Device Group
      return Promise.all([
          _.gcm.addDeviceGroupMember(account.email, account.gcm_notification_key, recorder.gcm_registration_token),
          link(),
        ]);
    })
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      console.log(err);
      reply.fail(err);
    });
}
