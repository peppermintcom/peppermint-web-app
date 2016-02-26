var spec = require('./spec');
var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.isjsonapi,
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  _.middleware.validateBody(spec),
  stamp,
]);

var CONDITION = 'attribute_not_exists(#read)';

function stamp(request, reply) {
  _.messages.update(request.body.data.id, 'SET #read = :now', {
      ':now': {N: Date.now().toString()},
    }, {
      '#read': 'read',
    }, CONDITION)
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      reply.fail(err);
    });
}
