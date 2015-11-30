var _ = require('utils');

exports.handler = function(request, reply) {
  if (!request.api_key || !request.email) {
    reply.fail('Bad Request: ' + (request.api_key ? 'missing email' : 'missing api_key'));
    return;
  }
  if (!_.apps[request.api_key]) {
    reply.fail('Unauthorized: unknown api_key');
    return;
  }

  _.accounts.get(request.email)
    .then(function(account) {
      reply.fail(account ? 'Unauthorized' : 'Not Found');
    })
    .catch(function(err) {
      reply.fail(err);
    });
};
