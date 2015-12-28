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

exports.get = function(email) {
  return dynamo.get('accounts', {
    email: {S: email.toLowerCase()},
  })
  .then(parseAccountItem);
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

      resolve(parseAccountItem(data.Items && data.Items[0]));
    });
  });
};

exports.update = function(email, values) {
  return new Promise(function(resolve, reject) {
    var attrs = _.mapValues(values, function(v) {
      return {Value: v};
    });

    _.dynamo.updateItem({
      TableName: 'accounts',
      Key: {
        email: {S: email.toLowerCase()},
      },
      AttributeUpdates: attrs,
    }, function(err, data) {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      resolve();
    });
  });
};

function parseAccountItem(account) {
  if (!account) return null;

  return {
    account_id: account.account_id.S,
    full_name: account.full_name.S,
    email: account.email.S,
    password: account.password.S,
    registration_ts: parseInt(account.registration_ts.N, 10),
    is_verified: !!account.verification_ts,
    verification_ts: account.verification_ts && account.verification_ts.N,
    verification_ip: account.verification_ip && parseInt(account.verification_ip.S, 10),
  };
}

exports.createDeviceGroup = function(email) {
  return _.http.postJSON('https://android.googleapis.com/gcm/notification', {
      operation: 'create',
      notification_key_name: email,
    }, {
      Authorization: 'key=' + process.env.PEPPERMINT_GCM_API_KEY, 
      project_id: process.env.PEPPERMINT_GCM_SENDER_ID,
    })
    .then(function(res) {
      console.log(res.statusCode);
      console.log(res.headers);
      console.log(res.body);
      if (res.statusCode === 201 || res.statusCode === 200) {
        return update(email, {
          gcm_notification_key: {S: notificationKey},
        });
      }
    });
};
