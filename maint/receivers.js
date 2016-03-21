var recorders = require('./recorders');
var accounts = require('./accounts');
var csp = require('js-csp');
var _ = require('./utils');

//Delete a receiver unless both its recorder and account exist in the database.
//Scans over every item in the receivers table, then checks the recorders table,
//and finally checks the accounts table. Avoids checking the recorder and
//account tables concurrently to reduce unneeded calls.
function clean() {
  var receivers = _.scan(params());
  var recorderOK = filterRecorderExists(receivers);
  var accountOK = filterAccountExists(recorderOK.pass);
 
  //ignore receivers with a recorder and account
  //_.pipe(accountOK.pass, _.devnull());
  _.devnull(accountOK.pass);

  //log all errors
  _.stdout(_.merge(recorderOK.errors, accountOK.errors));

  //discard anything without a recorder or account
  _.spawn(discard(_.merge(recorderOK.fail, accountOK.fail)));
}

//unfiltered
function params() {
  return {
    TableName: 'receivers',
    Limit: 10,
  };
}

//If an account exists with the receiver's account_id then forward
//the receiver to the pass channel. Otherwise forward to the fail channel.
function filterAccountExists(source) {
  return _.filterAsync(source, function(receiver) {
    return accounts.existsID(receiver.account_id.S);
  });
}

//If a recorder exists with the receiver's recorder_id then forward the receiver
//to the done channel. Otherwise forward it to the fail channel.
function filterRecorderExists(source) {
  return _.filterAsync(source, function(receiver) {
    return recorders.existsID(receiver.recorder_id.S);
  });
}

//Batch and discard everything that comes down the in (receivers) channel. No
//out channel.
function* discard(receivers) {
  var receiver;

  while ((receiver = yield receivers) != csp.CLOSED) {
    var batch = _.batch(24, receivers);

    batch.push(receiver);

    var err = yield _.batchDiscard('receivers', _.map(batch, function(receiver) {
      //these should be the only properties on the item, but map it anyway for
      //forward consistency
      return _.pick(receiver, 'recorder_id', 'account_id');
    }));

    if (err) _.log(err);
    batch
      .map(function(receiver) {
        return receiver.recorder_id.S + ',' + receiver.account_id.S;
      })
      .map(_.log);
  }
}

exports.clean = clean;
