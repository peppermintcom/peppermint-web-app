var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  validatePeppermintAuthHeader,
  handle,
]);

function validatePeppermintAuthHeader(request, reply) {
  if (!request.Authorization) {
    reply.fail({
      status: '400',
      detail: 'Authorization header required',
    });
    return;
  }
  if (!_.auth.isValid(request.Authorization)) {
    reply.fail({
      status: '400',
      detail: 'Authorization header does not follow Peppermint scheme',
    });
    return;
  }
  reply.succeed(request);
}

function handle(request, reply) {
  var creds = null;

  try {
    creds = _.auth.decode(request.Authorization);
  } catch(e) {
    reply.fail({
      status: '400',
      detail: 'Could not parse Authorization header',
    });
    return;
  }

  Promise.all([
    creds.account ? _.accounts.get(creds.account.user) : Promise.resolve(),
    //recorder.user is the client_id, the key in the recorders table
    creds.recorder ? _.recorders.get(creds.recorder.user) : Promise.resolve(),
  ])
  .then(function(results) {
    var account = results[0];
    var recorder = results[1];

    if (creds.account && !account) {
      reply.fail({
        status: '404',
        detail: 'Account not found',
      });
      return;
    }
    if (creds.recorder && !recorder) {
      reply.fail({
        status: '404',
        detail: 'Recorder not found',
      });
      return;
    }

    return Promise.all([
      account ? _.bcryptCheck(creds.account.password, account.password) : Promise.resolve(),
      recorder ? _.bcryptCheck(creds.recorder.password, recorder.recorder_key) : Promise.resolve(),
    ])
    .then(function(results) {
      var accountOK = results[0];
      var recorderOK = results[1];

      if (accountOK === false) {
        reply.fail({
          status: '401',
          detail: 'account password',
        });
        return;
      }
      if (recorderOK === false) {
        reply.fail({
          status: '401',
          detail: 'recorder key',
        });
        return;
      }
      var id = _.uuid();
      var jwt = _.jwt.creds(account && account.account_id, recorder && recorder.recorder_id, id);
      var accountResource = _.accounts.resource(account);
      var recorderResource = _.recorders.resource(recorder);
      var relationships = _.assign({},
          accountResource ? {account: _.pick(accountResource, 'id', 'type')} : null,
          recorderResource ? {recorder: _.pick(recorderResource, 'id', 'type')} : null
      );

      if (recorderResource) {
        delete recorderResource.attributes.recorder_key;
      }

      reply.succeed({
        data: {
          type: 'jwts',
          id: id,
          attributes: {
            token: jwt,
          },
          relationships: relationships,
        },
        included: _.compact([accountResource, recorderResource]),
      });
    })
    .catch(function(err) {
      console.log(err);
      reply.fail(err);
    });
  });
}
