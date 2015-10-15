var _ = require('lodash');
var randomstring = require('randomstring');
var bcrypt = require('bcrypt-nodejs');

const BCRYPT_COST = 11;

exports.db = require('./db');

exports.token = function(length) {
  return randomstring.generate({
    length: length || 32,
    charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
  });
};

exports.timestamp = function(d) {
  d = new Date(d);

  return [
    [
      d.getUTCFullYear(),
      _.padLeft((d.getUTCMonth() + 1).toString(), 2, '0'),
      _.padLeft(d.getUTCDate().toString(), 2, '0'),
    ].join('-'),
    [
      _.padLeft(d.getUTCHours().toString(), 2, '0'),
      _.padLeft(d.getUTCMinutes().toString(), 2, '0'),
      _.padLeft(d.getUTCSeconds().toString(), 2, '0'),
    ].join(':')
  ].join(' ');
};

/**
 * @param {String} s
 */
exports.bcryptHash = function(s) {
  return new Promise(function(resolve, reject) {
    bcrypt.genSalt(BCRYPT_COST, function(err, salt) {
      if (err) {
        reject(err);
        return;
      }
      bcrypt.hash(s, salt, null, function(err, hash) {
        if (err) {
          reject(err);
          return;
        }
        resolve(hash);
      });
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

module.exports = _.assign(exports, _);
