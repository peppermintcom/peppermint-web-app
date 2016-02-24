var _ = require('utils');
var spec = require('./spec');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  allow,
  unlink
]);

function allow(request, reply) {
  var ok = true;
  if (!request.jwt.recorder_id || request.jwt.recorder_id !== request.recorder_id) {
    reply.fail({
      status: '403',
      detail: 'Recorder not authenticated',
    });
    return;
  }
  reply.succeed(request);
}

function unlink(request, reply) {
  _.receivers.unlink(request.recorder_id, request.account_id)
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      reply.fail(err);
    });
}