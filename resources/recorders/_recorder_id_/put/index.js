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
  _.recorders.update(request.recorder_id, {
      gcm_registration_token: {S: request.body.data.attributes.gcm_registration_token},
    })
    .then(function() {
      //TODO update GCM device groups that include the old recorder token to use
      //the new recorder token
      reply.succeed();
    })
    .catch(function(err) {
      reply.fail(err);
    });
}
