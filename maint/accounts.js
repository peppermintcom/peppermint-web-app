var csp = require('js-csp');
var _ = require('./utils');

function clean() {
  var accounts = _.scan(params());

  csp.go(function*() {
    var account;

    while ((account = yield accounts) != csp.CLOSED) {
      var batch = _.batch(24, accounts);

      batch.push(account);

      var err = yield _.batchDiscard('accounts', _.map(batch, function(account) {
        if (!/@mailinator\.com$/.test(account.email.S)) {
          throw new Error(account.email.S);
        }
        if ((Date.now() - +account.registration_ts.N) < _.WEEK) {
          throw new Error(account.registration_ts.N);
        }
        return {email: {S: account.email}};
      }));
      if (err) _.log(err);

      batch
        .map(function(account) {
          return account.email.S;
        })
        .forEach(_.log);
    }
  });
}

//email ends with "@mailinator.com" and it is at least a week old
function params() {
  var weekAgo = Date.now() - _.WEEK;

  return {
    TableName: 'accounts',
    Limit: 20,
    FilterExpression: 'contains (email, :domain) AND registration_ts <= :week_ago',
    ExpressionAttributeValues: {
      ':domain': {S: '@mailinator.com'},
      ':week_ago': {N: weekAgo.toString()},
    },
  };
}

function existsID(accountID) {
  var done = csp.chan();

  _.accounts.getByID(accountID)
    .then(function(item) {
      csp.putAsync(done, item ? true : false);
    })
    .catch(function(err) {
      csp.putAsync(done, err);
    });

  return done;
}

exports.existsID = existsID;
exports.clean = clean;
