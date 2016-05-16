var fs = require('fs');
var util = require('util');
var path = require('path');
var smtp = require('./email');
var ses = require('./ses');
var dynamo = require('./dynamo');
var timestamp = require('./timestamp');
var token = require('./randomtoken');
var jwt = require('./jwt');
var http = require('./http');
var _ = require('lodash');
var verifyTmpl = _.template(fs.readFileSync(path.join(__dirname, 'templates/verify.html'), 'utf8'));
var resetTmpl = _.template(fs.readFileSync(path.join(__dirname, 'templates/recover.html'), 'utf8'));

exports.verifyEmail = function(email, name) {
  //expires in 15 minutes
  var token = jwt.encode(email, 15 * 60);

  return ses({
    from: 'Peppermint <noreply@peppermint.com>',
    to: email,
    html: verifyTmpl({name: name, token: token}),
    subject: 'Verify Your Account',
    text: 'https://peppermint.com/verify-email?at=' + token,
  });
};

exports.sendPasswordResetEmail = function(email, jwt) {
  return new Promise(function(resolve, reject) {
    smtp.send({
      text: 'https://peppermint.com/reset?jwt=' + jwt,
      from: 'Peppermint <noreply@peppermint.com>',
      subject: 'Reset your password.',
      to: email,
      attachment: [
        {data: resetTmpl({jwt: jwt}), alternative: true},
      ],
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

var get = exports.get = function(email) {
  if (!email) {
    return Promise.resolve(null);
  }

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

    dynamo.updateItem({
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

exports.del = function(email) {
  return dynamo.del('accounts', {email: {S: email}});
};

exports.upsert = function(profile) {
  return get(profile.email)
    .then(function(account) {
      if (account) {
        return account;
      }
      var accountID = token(22);
      var now = Date.now();
      var item = {
        account_id: {S: accountID},
        email: {S: profile.email},
        full_name: {S: profile.full_name},
        registration_ts: {N: now.toString()},
      };

      if (profile.source === 'facebook' || profile.source === 'google') {
        item.verification_ip = {S: profile.source};
        item.verification_ts = {N: now.toString()};
      }

      return dynamo.put('accounts', item)
        .then(function() {
          var account = {
            account_id: accountID,
            email: profile.email,
            full_name: profile.full_name,
            registration_ts: now,
            is_verified: profile.source === 'facebook' || profile.source === 'google',
          };

          if (profile.source === 'facebook' || profile.source === 'google') {
            item.verification_ip = profile.source;
            item.verification_ts = now;
          }

          return account;
        });
    });
};
 
exports.resource = function(account) {
  if (!account) return null;

  return {
    type: 'accounts',
    id: account.account_id,
    attributes: {
      email: account.email,
      full_name: account.full_name,
      registration_ts: timestamp(account.registration_ts),
      is_verified: account.is_verified,
    },
  };
};

function parseAccountItem(account) {
  if (!account) return null;

  return {
    account_id: account.account_id.S,
    full_name: account.full_name.S,
    email: account.email.S,
    password: account.password && account.password.S,
    registration_ts: parseInt(account.registration_ts.N, 10),
    is_verified: !!account.verification_ts,
    verification_ts: account.verification_ts && account.verification_ts.N,
    verification_ip: account.verification_ip && parseInt(account.verification_ip.S, 10),
  };
}
