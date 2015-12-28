//This module contains all utilities in index.js plus more used only in tests.
var request = require('request');
var _ = require('./index');

const API_URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1';

var exports = _.assign(exports, _);

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

exports.deleteRecorder = function(client_id) {
  return new Promise(function(resolve, reject) {
    _.dynamo.deleteItem({
      Key: {client_id: {S: client_id}},
      TableName: 'recorders',
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

exports.verifyAccount = function(email, ip) {
  return new Promise(function(resolve, reject) {
    _.dynamo.updateItem({
      TableName: 'accounts',
      Key: {
        email: {S: email.toLowerCase()},
      },
      AttributeUpdates: {
        verification_ts: {Value: {N: Date.now().toString()}},
        verification_ip: {Value: {S: ip}},
      },
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

exports.basic = function(user, password) {
  return 'Basic ' + new Buffer(user + ':' + password).toString('base64');
};

exports.http = function(method, path, body, headers) {
  return new Promise(function(resolve, reject) {
    if (method.toLowerCase() === 'get') {
      request(API_URL + path, {
        headers: headers,
      }, function(err, res, body) {
        if (err) {
          reject(err);
          return;
        }
        res.body = JSON.parse(body);
        resolve(res);
      });
      return;
    }

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
