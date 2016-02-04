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
  _.receivers.link(request.jwt.recorder_id, request.jwt.account_id)
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      console.log(err);
      reply.fail(err);
    });
}
