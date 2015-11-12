//This module contains all utilities in index.js plus more used only in tests.
var _ = require('./index');

exports.fake = require('./fake');

exports.deleteAccount = function(email) {
  return new Promise(function(resolve, reject) {
    _.dynamo.deleteItem({
      Key: {email: {S: email}},
      TableName: 'accounts',
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

exports.basic = function(user, password) {
  return 'Basic ' + new Buffer(user + ':' + password).toString('base64');
};

module.exports = _.assign(exports, _);
