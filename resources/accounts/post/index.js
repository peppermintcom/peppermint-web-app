var tv4 = require('tv4');
var _ = require('utils');
var conf = require('utils/conf');
var bodySchema = _.bodySchema(require('./spec').parameters);

/**
 * Registers a new instance of an app. The app can be identified by the API key
 * provided in the payload.
 */
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
      //generate jwt with account_id and recorder_id
      var jwt = _.jwt(accountID, null);

      _.mandrill.messages.send({
        message: {
          from_email: 'noreply@peppermint.com',
          html: '<a href="http://localhost/verify/' + jwt + '">Verify</a>',
          subject: 'Verify your email',
          to: [{email: request.u.email}],
          track_clicks: false,
          track_opens: false,
        },
      }, function(result) {
        if (!result[0] || result[0].reject_reason) {
          reply.fail('Bad Request: ' + (result[0] && result[0].reject_reason));
          return;
        }
 
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
      }, function(err) {
        reply.fail('Mandrill: ' + err.toString());
      });
    });
  })
  .catch(function(err) {
    console.log('unknown error');
    console.log(err);
    reply.fail('Internal Server Error');
  });
};
