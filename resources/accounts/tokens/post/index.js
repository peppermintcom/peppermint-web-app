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
  var email = credentials[0];
  var pass = credentials[1];

  //get account from dynamo
  _.dynamo.get('accounts', {
      email: {S: email},
    })
    .then(function(account) {
      if (!account) {
        throw NOT_FOUND;
      }

      return _.bcryptCheck(pass, account.password.S)
        .then(function(ok) {
          if (!ok) {
            reply.fail('Unauthorized: incorrect password');
            return;
          }
          reply.succeed({
            at: _.jwt.creds(account.account_id.S),
            u: {
              account_id: account.account_id.S,
              email: account.email.S,
              full_name: account.full_name.S,
              registration_ts: _.timestamp(new Date(parseInt(account.registration_ts.N, 10))),
            },
          });
        });
    })
    .catch(function(err) {
      reply.fail(err);
      return;
    });
};
