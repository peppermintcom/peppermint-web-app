var dynamo = require('./dynamo');
var accounts = require('./accounts');

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
};

exports.get = function(recorderID, accountID) {
  return dynamo.get('receivers', {
    recorder_id: {S: recorderID},
    account_id: {S: accountID},
  })
  .then(parseReceiverItem);
};

function parseReceiverItem(item) {
  if (!item) return null;

  return {
    recorder_id: item.recorder_id.S,
    account_id: item.account_id.S,
  };
}
