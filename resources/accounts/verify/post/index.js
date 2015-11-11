var _ = require('utils');

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);

  _.dynamo.get('accounts', {
      account_id: {S: jwt.account_id},
    })
    .then(function(account) {
      return _.verifyEmail(account.email.S);
    })
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      reply.fail(err);
    });
};
