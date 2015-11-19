var mandrill = require('./mandrill');
var dynamo = require('./dynamo');
var jwt = require('./jwt');

exports.verifyEmail = function(email, name) {
  return new Promise(function(resolve, reject) {
    //expires in 15 minutes
    var token = jwt.encode(email, 15 * 60);

    mandrill.messages.sendTemplate({
      template_name: 'confirm-account',
      template_content: [],
      message: {
        to: [
          {email: email, name: name},
        ],
        track_clicks: false,
        track_opens: false,
        merge_language: 'handlebars',
        global_merge_vars: [
          {
            name: 'name',
            content: name,
          },
          {
            name: 'token',
            content: token,
          }
        ],
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

exports.getByID = function(accountID) {
  return new Promise(function(resolve, reject) {
    dynamo.query({
      TableName: 'accounts',
      IndexName: 'account_id-index',
      KeyConditionExpression: 'account_id = :account_id',
      ExpressionAttributeValues: {
        ':account_id': {S: accountID},
      },
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (data.Count > 1) {
        var msg = 'account lookup by id "' + accountID + '" returned multiple accounts';
        
        console.log(msg);
        reject(new Error(msg));
        return;
      }
      var account = data.Items && data.Items[0];

      resolve(account && {
        account_id: account.account_id.S,
        full_name: account.full_name.S,
        email: account.email.S,
        password: account.password.S,
        registration_ts: parseInt(account.registration_ts.N, 10),
        is_verified: !!account.verification_ts,
        verification_ts: account.verification_ts && account.verification_ts.N,
        verification_ip: account.verification_ip && parseInt(account.verification_ip.S, 10),
      });
    });
  });
};
