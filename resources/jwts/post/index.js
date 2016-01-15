var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  validatePeppermintAuthHeader,
  handle,
]);

function validatePeppermintAuthHeader(request, reply) {
  if (!request.Authorization) {
    reply.fail('Bad Request: Authorization header required');
    return;
  }
  if (!_.auth.isValid(request.Authorization)) {
    reply.fail('Bad Request: Authorization header does not follow Peppermint scheme');
    return;
  }
  reply.succeed(request);
}

function handle(request, reply) {
  var creds = null;

  try {
    creds = _.auth.decode(request.Authorization);
  } catch(e) {
    reply.fail('Bad Request: could not parse Authorization header');
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
      reply.fail('Not found: account');
      return;
    }
    if (creds.recorder && !recorder) {
      reply.fail('Not found: recorder');
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
        reply.fail('Unauthorized: account password');
        return;
      }
      if (recorderOK === false) {
        reply.fail('Unauthorized: recorder key');
        return;
      }
      var jwt = _.jwt.creds(account && account.account_id, recorder && recorder.recorder_id);
      reply.succeed({jwt: jwt});
    })
    .catch(function(err) {
      console.log(err);
      reply.fail(err);
    });
  });
}
