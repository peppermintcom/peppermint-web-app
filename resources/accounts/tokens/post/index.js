var _ = require('utils');

var NOT_FOUND = new Error('Unauthorized: unknown email');

exports.handler = function(request, reply) {
  var auth = (request.Authorization || '').trim().split(' ');

  if (auth.length !== 2 || auth[0] !== 'Basic') {
    reply.fail('Unauthorized: Authorization header for Basic access authentication is required');
    return;
  }

  //get email and password from Authorization header
  var credentials = new Buffer(auth[1], 'base64').toString('utf8').split(':');
  var email = credentials[0].toLowerCase();
  var pass = credentials[1];
  
  if (!email || !pass) {
    reply.fail('Unauthorized: email and password are required');
    return;
  }

  //get account from dynamo
  _.accounts.get(email)
    .then(function(account) {
      if (!account) {
        throw NOT_FOUND;
      }

      return _.bcryptCheck(pass, account.password)
        .then(function(ok) {
          if (!ok) {
            reply.fail('Unauthorized: incorrect password');
            return;
          }
          reply.succeed({
            at: _.jwt.creds(account.account_id),
            u: _.pick(account, 'account_id', 'email', 'full_name', 'registration_ts', 'is_verified'),
          });
        });
    })
    .catch(function(err) {
      reply.fail(err);
      return;
    });
};
