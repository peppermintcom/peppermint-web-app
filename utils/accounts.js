var mandrill = require('./mandrill');
var jwt = require('./jwt');

exports.verifyEmail = function(email) {
  return new Promise(function(resolve, reject) {
    //expires in 15 minutes
    var token = jwt.encode(email, 15 * 60);

    mandrill.messages.send({
      message: {
        from_email: 'noreply@peppermint.com',
        html: '<a href="https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/accounts/verify?jwt=' + token + '">Verify</a>',
        subject: 'Verify your email',
        to: [{email: email}],
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
      console.log(err);
      reject('Mandrill: ' + err);
    });
  });
};
