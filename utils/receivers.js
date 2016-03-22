var dynamo = require('./dynamo');
var accounts = require('./accounts');
var recorders = require('./recorders');

//lookup all accounts linked to a recorder
exports.accounts = function(recorderID) {
  return new Promise(function(resolve, reject) {
    dynamo.query({
      TableName: 'receivers',
      IndexName: 'recorder_id-index',
      KeyConditionExpression: 'recorder_id = :recorder_id',
      ExpressionAttributeValues: {
        ':recorder_id': {S: recorderID},
      },
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve((data.Items || []).map(parseReceiverItem));
    });
  })
  .then(function(records) {
    return Promise.all(records.map(function(record) {
      return accounts.getByID(record.account_id);
    }));
  })
  .then(function(accounts) {
    return _.compact(accounts);
  });
};

//lookup all recorders lined to an account
exports.recorders = function(accountID) {
  return new Promise(function(resolve, reject) {
    dynamo.query({
      TableName: 'receivers',
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
      resolve((data.Items || []).map(parseReceiverItem));
    })
  })
  .then(function(records) {
    return Promise.all(records.map(function(record) {
      return recorders.getByID(record.recorder_id);
    }));
  })
  .then(function(recorders) {
    return _.compact(recorders);
  });
};

exports.get = function(recorderID, accountID) {
  return dynamo.get('receivers', {
    recorder_id: {S: recorderID},
    account_id: {S: accountID},
  })
  .then(parseReceiverItem);
};

exports.link = function(recorderID, accountID) {
  return dynamo.put('receivers', {
    recorder_id: {S: recorderID},
    account_id: {S: accountID},
  });
};

exports.unlink = function(recorderID, accountID) {
  return dynamo.del('receivers', {
    recorder_id: {S: recorderID},
    account_id: {S: accountID},
  });
};

function parseReceiverItem(item) {
  if (!item) return null;

  return {
    recorder_id: item.recorder_id.S,
    account_id: item.account_id.S,
  };
}
