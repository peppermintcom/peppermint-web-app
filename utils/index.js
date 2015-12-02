require('es6-promise').polyfill();
var conf = require('./conf.js');
var _ = require('lodash');
var randomstring = require('randomstring');
var bcrypt = require('bcryptjs');
var errors = require('./errors');
var jwt = require('./jwt');

//while using js
const BCRYPT_COST = 8;

exports.apps = require('./apps');
exports.dynamo = require('./dynamo');
exports.mandrill = require('./mandrill');
exports.accounts = require('./accounts');
exports.jwt = jwt;
exports.errors = errors;

//generate random tokens
exports.token = function(length) {
  return randomstring.generate({
    length: length || 32,
    charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
  });
};

//current time in YYYY-MM-DD HH:MM:SS string format
exports.timestamp = function(d) {
  d = d ? new Date(d.valueOf()) : new Date();

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

/**
 * Each path operation includes a spec with an array of paramters. This utility
 * gets the schema for the body parameter.
 */
exports.bodySchema = function(parameters) {
  var param =  _.find(parameters, function(param) {
    return param['in'] === 'body';
  });

  return param && param.schema;
};

module.exports = _.assign(exports, _);
