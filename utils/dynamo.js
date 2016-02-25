var https = require('https');
var _ = require('lodash');
var aws = require('aws-sdk');

if (process.env.NODE_ENV === 'development') {
  aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});
}

var dynamo = new aws.DynamoDB({
    apiVersion: '2012-08-10',
    region: 'us-west-2',
      httpOptions: {
        agent: new https.Agent({
          rejectUnauthorized: true,
          keepAlive: true,
          secureProtocol: 'TLSv1_method',
          ciphers: 'ALL',
        }),
      },
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
      ConsistentRead: true,
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

exports.update = function(table, key, expr, values, names) {
  return new Promise(function(resolve, reject) {
    values = values ? {ExpressionAttributeValues: values} : null;
    names = names ? {ExpressionAttributeNames: names} : null;

    dynamo.updateItem(_.assign({
      TableName: table,
      Key: key,
      UpdateExpression: expr,
    }, values, names), function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

exports.del = function(table, key) {
  return new Promise(function(resolve, reject) {
    dynamo.deleteItem({
      TableName: table,
      Key: key,
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

/**
 * retrieve an item from a table using a secondary index
 * @param {String} table
 * @param {String} index
 * @param {String} attribute
 * @param {Object} value
 * @return {Promise}
 */
exports.fetch = function(table, index, attribute, value) {
  return new Promise(function(resolve, reject) {
    var match = {};

    //{":account_id": {S: accountID}}
    match[':' + attribute] = value;

    dynamo.query({
      TableName: table,
      IndexName: index,
      //"account_id = :account_id"
      KeyConditionExpression: attribute + ' = :' + attribute,
      ExpressionAttributeValues: match,
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(data.Items);
    });
  });
};

function query(params, lastKey, items) {
  var last = lastKey ? {ExclusiveStartKey: lastKey} : null;
  items = items || [];

  return new Promise(function(resolve, reject) {
    dynamo.query(_.assign({}, params, last), function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (data.LastEvaluatedKey) {
        resolve(query(params, data.LastEvaluatedKey, data.Items.concat(items)));
        return;
      }
      resolve(data.Items.concat(items));
    });
  });
}

exports.queryAll = function(params) {
  return query(params);
};

module.exports = _.assign(dynamo, exports);
