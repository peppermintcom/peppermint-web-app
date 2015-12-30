require('es6-promise').polyfill();
var conf = require('./conf.js');
var _ = require('lodash');
var bcrypt = require('bcryptjs');
var errors = require('./errors');
var jwt = require('./jwt');

//while using js
const BCRYPT_COST = 8;

exports.apps = require('./apps');
exports.bodySchema = require('./bodySchema');
exports.dynamo = require('./dynamo');
exports.email = require('./email');
exports.mandrill = require('./mandrill');
exports.accounts = require('./accounts');
exports.http = require('./http');
exports.transcriptions = require('./transcriptions');
exports.messages = require('./messages');
exports.middleware = require('./middleware');
exports.token = require('./randomtoken');
exports.timestamp = require('./timestamp');
exports.jwt = jwt;
exports.errors = errors;

/**
 * @param {String} plaintext
 */
exports.bcryptHash = function(plaintext) {
  return new Promise(function(resolve, reject) {
    bcrypt.hash(plaintext, BCRYPT_COST, function(err, hash) {
      if (err) {
        reject(err);
        return;
      }
      resolve(hash);
    });
  });
};

/**
 * @param {String} plain
 * @param {String} hash
 */
exports.bcryptCheck = function(plain, hash) {
  return new Promise(function(resolve, reject) {
    bcrypt.compare(plain, hash, function(err, ok) {
      if (err) {
        reject(err);
        return;
      }
      resolve(ok);
    });
  });
};

/**
 * Checks and parses the JWT from an Authorization Bearer header.
 * @param {Authorization} string
 */
exports.authenticate = function(Authorization) {
  var parts = (Authorization || '').trim().split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      err: errors.MALFORMED,
    };
  }

  return jwt.verify(parts[1]);
};

module.exports = _.assign(exports, _);
