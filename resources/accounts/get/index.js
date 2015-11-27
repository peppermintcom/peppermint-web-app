var _ = require('utils');

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);
  var accountID = request.account_id;

  if (!accountID) {
    reply.fail('Bad Request: missing account_id path parameter');
    return;
  }

  _.accounts.getByID(accountID)
    .then(function(account) {
      if (!account) {
        reply.fail('Not Found');
        return;
      }
      if (jwt.err) {
        reply.fail('Unauthorized: ' + jwt.err);
        return;
      }
      if (!jwt.account_id) {
        reply.fail('Unauthorized');
       return;
      }
      if (accountID !== jwt.account_id) {
        reply.fail('Forbidden');
        return;
      }

      account.registration_ts = _.timestamp(account.registration_ts);
      reply.succeed(_.omit(account, 'password', 'verification_ts', 'verification_ip'));
    })
    .catch(function(err) {
      reply.fail(err);
    });
};
