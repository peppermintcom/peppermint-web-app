var mandrill = require('./mandrill');

exports.verifyEmail = function(account_id, email) {
  return new Promise(function(resolve, reject) {
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
        reject(result[0] && result[0].reject_reason);
        return;
      }
      resolve();
    }, function(err) {
      reply.fail('Mandrill: ' + err.toString());
    });
  });
};
