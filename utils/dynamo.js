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
        reject(err);
        return;
      }
      resolve(data.Item);
    });
  });
};

module.exports = _.assign(dynamo, exports);
