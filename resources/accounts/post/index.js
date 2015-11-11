var tv4 = require('tv4');
var _ = require('utils');
var conf = require('utils/conf');
var bodySchema = _.bodySchema(require('./spec').parameters);

exports.handler = function(request, reply) {
  var isValid = tv4.validate(request, bodySchema);

  if (!isValid) {
    reply.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }
  if (!_.apps[request.api_key]) {
    reply.fail('Unauthorized: unknown api_key');
    return;
  }

  var accountID = _.token(22);
  var ts = new Date();

  _.bcryptHash(request.u.password).then(function(hash) {
    var item = {
      account_id: {S: accountID},
      email: {S: request.u.email},
      password: {S: hash},
      first_name: {S: request.u.first_name},
      last_name: {S: request.u.last_name},
      registration_ts: {N: ts.valueOf().toString()},
    };

    _.dynamo.putItem({
      Item: item,
      TableName: 'accounts',
      ConditionExpression: 'attribute_not_exists(email)',
    }, function(err, data) {
      if (err) {
        console.log('dynamo putItem error');
        if (err.code === 'ConditionalCheckFailedException') {
          reply.fail('Conflict: duplicate email');
          return;
        }
        console.log(err);
        reply.fail('Internal Server Error');
        return;
      }

      return _.accounts.verifyEmail(accountID, require.u.email)
        .then(function() {
          reply.succeed({
            at: jwt,
            u: {
              account_id: accountID,
              first_name: request.u.first_name,
              last_name: request.u.last_name,
              email: request.u.email,
              registration_ts: _.timestamp(ts),
            },
          });
        });
    });
  })
  .catch(function(err) {
    console.log('unknown error');
    console.log(err);
    reply.fail('Internal Server Error');
  });
};
