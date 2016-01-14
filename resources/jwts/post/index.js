var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  validatePeppermintAuthHeader,
  handle,
]);

function validatePeppermintAuthHeader(request, reply) {
  if (!_.auth.isValid(request.Authorization)) {
    reply.fail('Bad Request: Authorization header does not follow Peppermint scheme');
    return;
  }
  reply.succeed();
}

function handle(request, reply) {
  var creds = _.auth.decode(request.Authorization);

  Promise.all([
    creds.account ? _.accounts.getByID(creds.account.user) : Promise.resolve(),
    creds.recorder ? _.dynamo.get('recorder', {S: creds.recorder.user}) : Promise.resolve(),
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
      account ? _.bcryptCheck(account.password) : Promise.resolve(0),
      recorder ? _.bcryptCheck(recorder.recorder_key) : Promise.resolve(0),
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
      var jwt = _.jwt.creds(creds.account.user, recorder.account.user);
      reply.succeed({jwt: jwt});
    })
    .catch(function(err) {
      console.log(err);
      reply.fail(err);
    });
  });
}
