var _ = require('utils');

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);
  var accountID = request.account_id;

  if (jwt.err) {
    reply.fail('Unauthorized: ' + jwt.err.toString());
    return;
  }
  if (!jwt.account_id) {
    reply.fail('Unauthorized');
    return;
  }
  if (!accountID) {
    reply.fail('Bad Request: missing account_id path parameter');
    return;
  }
  if (accountID !== jwt.account_id) {
    reply.fail('Forbidden');
    return;
  }

  _.accounts.getByID(jwt.account_id)
    .then(function(account) {
      if (!account) {
        reply.fail('Not Found');
        return;
      }
      account.registration_ts = _.timestamp(account.registration_ts);
      reply.succeed(_.omit(account, 'password', 'verification_ts', 'verification_ip'));
    })
    .catch(function(err) {
      reply.fail(err);
    });
};
