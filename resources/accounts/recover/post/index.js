var tv4 = require('tv4');
var _ = require('utils');
var bodySchema = _.bodySchema(require('./spec').parameters);

exports.handler = function(request, reply) {
  //tv4
  var isValid = tv4.validate(request, bodySchema);

  if (!isValid) {
    reply.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }
  if (!_.apps[request.api_key]) {
    reply.fail('Unauthorized: unknown api_key');
    return;
  }
 
  //jwt email with 15 minute expiration
  var email = request.email;
  var jwt = _.jwtEncode(email, 15 * 60);

  _.dynamo.get('accounts', {email: {S: email}})
    .then(function(account) {
      if (!account) {
        reply.fail('Not Found: email');
        return;
      }

      _.mandrill.messages.send({
        message: {
          from_email: 'noreply@peppermint.com',
          html: '<a href="https://peppermint.com/reset/' + jwt + '">Reset</a>',
          subject: 'Reset your password.',
          to: [{email: email}],
          track_clicks: false,
          track_opens: false,
        },
      }, function(result) {
        if (!result[0] || result[0].reject_reason) {
          reply.fail('Bad Request: ' + (result[0] && result[0].reject_reason));
          return;
        }

        reply.succeed({});
      }, function(err) {
        reply.fail('Mandrill: ' + err.toString());
      });
    });
};
