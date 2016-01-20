var _ = require('utils');
var spec = require('./spec');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  allow,
  _.middleware.validateBody(spec),
  handle
]);

//checks the token's recorder_id matches the path param
function allow(request, reply) {
  if (request.recorder_id !== request.jwt.recorder_id) {
    reply.fail('Forbidden: token only authenticates ' + request.jwt.recorder_id);
    return;
  }
  reply.succeed(request);
}

function handle(request, reply) {
  _.recorders.update(request.recorder_id, {
      {gcm_registration_token: {S: request.body.data.attributes.gcm_registration_token}},
    })
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      reply.fail(err);
    });
}
