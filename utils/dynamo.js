var _ = require('lodash');
var aws = require('aws-sdk');

if (process.env.NODE_ENV === 'development') {
  aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});
}

var dynamo = new aws.DynamoDB({
  apiVersion: '2012-08-10',
  region: 'us-west-2',
});

/**
 * Promise wrapper around getItem. No item found is not an error.
 * @param {String} table
 * @param {Object} key
 */
exports.get = function(table, key) {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      Key: key,
      TableName: table,
    }, function(err, data) {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      resolve(data.Item);
    });
  });
};

exports.put = function(table, item, more) {
  return new Promise(function(resolve, reject) {
    dynamo.putItem(_.assign({
      TableName: table,
      Item: item,
    }, more), function(err, data) {
      if (err) {
        if (err.code !== 'ConditionalCheckFailedException') {
          console.log(err);
        }
        reject(err);
        return;
      }
      resolve(data);
    });
  });
};

module.exports = _.assign(dynamo, exports);
