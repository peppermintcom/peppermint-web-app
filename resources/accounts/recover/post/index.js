var tv4 = require('tv4');
var _ = require('utils');
var bodySchema = _.bodySchema(require('./spec').parameters);

exports.handler = function(request, reply) {
  if (!tv4.validate(request, bodySchema)) {
    reply.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }
  if (!_.apps[request.api_key]) {
    reply.fail('Unauthorized: unknown api_key');
    return;
  }
 
  //jwt email with 15 minute expiration
  var email = request.email.toLowerCase();
  var jwt = _.jwt.encode(email, 15 * 60);

  _.dynamo.get('accounts', {email: {S: email}})
    .then(function(account) {
      if (!account) {
        throw new Error('Not Found: email');
        return;
      }

      return _.accounts.sendPasswordResetEmail(email, jwt);
    })
    .then(function() {
      reply.succeed({});
    })
    .catch(function(err) {
      reply.fail(err);
    });
};
