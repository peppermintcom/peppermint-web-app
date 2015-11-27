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

  var accountID = _.token(22);
  var email = request.u.email.toLowerCase();
  var ts = new Date();

  _.bcryptHash(request.u.password)
    .then(function(hash) {
      var item = {
        account_id: {S: accountID},
        email: {S: email},
        password: {S: hash},
        full_name: {S: request.u.full_name},
        registration_ts: {N: ts.valueOf().toString()},
      };

      return _.dynamo.put('accounts', item, {
        ConditionExpression: 'attribute_not_exists(email)',
      });
    })
    .then(function() {
      //wait until after saving account to database in case it's a dupe
      return _.accounts.verifyEmail(email, request.u.full_name);
    })
    .then(function() {
      reply.succeed({
        at: _.jwt.creds(accountID),
        u: {
          account_id: accountID,
          full_name: request.u.full_name,
          email: email,
          registration_ts: _.timestamp(ts),
        },
      });
    })
    .catch(function(err) {
      if (err.code === 'ConditionalCheckFailedException') {
        reply.fail('Conflict: duplicate email');
        return;
      }
      console.log(err);
      reply.fail('Internal Server Error');
    });
};
