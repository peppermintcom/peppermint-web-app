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
  reply.succeed();
}
