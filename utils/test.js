//This module contains all utilities in index.js plus more used only in tests.
var request = require('request');
var _ = require('./index');

const API_URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1';

exports.fake = require('./fake');

var deleteAccount = exports.deleteAccount = function(email) {
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
};
exports.deleteAccountAfter = function(email) {
  return function() {
    return deleteAccount(email);
  };
};

exports.basic = function(user, password) {
  return 'Basic ' + new Buffer(user + ':' + password).toString('base64');
};

exports.http = function(method, path, body, headers) {
  return new Promise(function(resolve, reject) {
    request({
      url: API_URL + path,
      method: method,
      json: true,
      body: body,
      headers: headers,
    }, function(err, res, body) {
      if (err) {
        reject(err);
        return;
      }
      res.body = body;
      resolve(res);
    });
  });
};

module.exports = _.assign(exports, _);
