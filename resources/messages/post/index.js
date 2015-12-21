var _ = require('utils');
var spec = require('./spec');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  _.middleware.validateBody(spec),
  handle
]);

function handle(request, reply) {
  _.messages.create(request.body)
    .then(function(message) {
      reply.succeed(message);
    });
}
