require('es6-promise').polyfill();
var conf = require('./conf.js');
var mandrill = require('mandrill-api');
var _ = require('lodash');
var randomstring = require('randomstring');
var bcrypt = require('bcryptjs');
var jwt = require('jwt-simple');
var Hashids = require('hashids');
var errors = require('./errors');
var hashids = new Hashids(conf.PEPPERMINT_HASHIDS_SALT);

//while using js
const BCRYPT_COST = 8;
const JWT_SECRET = conf.PEPPERMINT_JWT_SECRET;

if (JWT_SECRET.length < 40) {
  throw new Error('set env var PEPPERMINT_JWT_SECRET to a string 40 characters long');
}

exports.apps = require('./apps');
exports.dynamo = require('./dynamo');
exports.mandrill = new mandrill.Mandrill(conf.PEPPERMINT_MANDRILL_KEY);
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
  d = new Date(d.valueOf());

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

exports.jwt = (function() {
  var day = 60 * 60 * 24;

  return function(user_id, recorder_id) {
    var now = Math.floor(Date.now() / 1000)

    return jwt.encode({
      exp: now + (30 * day),
      iat: now,
      iss: 'peppermint.com',
      sub: [user_id || '', recorder_id].join('.'),
    }, JWT_SECRET);
  };
})();

var jwtVerify = exports.jwtVerify = function(token) {
  var r = {};

  try {
    r.payload = jwt.decode(token, JWT_SECRET);
  } catch(e) {
    r.err = e;
    return r;
  }

  if (r.payload.exp < Math.ceil(Date.now() / 1000)) {
    r.err = errors.EXPIRED;
  }

  r.recorder_id = r.payload.sub.split('.')[1];
  return r;
};

/**
 * Checks and parses the JWT from an Authorization Bearer header.
 * @param {Authorization} string
 */
exports.authenticate = function(Authorization) {
  var parts = (Authorization || '').trim().split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      err: errors.UNAUTHORIZED,
    };
  }

  return jwtVerify(parts[1]);
};

exports.hashID = function(id) {
  return hashids.encode(parseInt(id, 10));
};

exports.unhashID = function(hash) {
  return hashids.decode(hash)[0];
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
