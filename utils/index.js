require('es6-promise').polyfill();
var util = require('util');
var conf = require('./conf.js');
var _ = require('lodash');
var errors = require('./errors');
var jwt = require('./jwt');
var token = require('./randomtoken');
var bcrypt = require('./bcrypt')

exports.apps = require('./apps');
exports.auth = require('./auth');
exports.bodySchema = require('./bodySchema');
exports.dynamo = require('./dynamo');
exports.email = require('./email');
exports.gcm = require('./gcm');
exports.accounts = require('./accounts');
exports.http = require('./http');
exports.shortURLs = require('./shortURLs');
exports.transcriptions = require('./transcriptions');
exports.messages = require('./messages');
exports.middleware = require('./middleware');
exports.receivers = require('./receivers');
exports.token = token;
exports.recorders = require('./recorders');
exports.timestamp = require('./timestamp');
exports.parseTime = require('./parseTime');
exports.uploads = require('./uploads');
exports.jwt = jwt;
exports.errors = errors;
exports.bcryptCheck = bcrypt.check
exports.bcryptHash = bcrypt.hash

exports.log = function(x) {
  console.log(util.inspect(x, {depth: null}));
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

exports.uuid = _.partial(token, 22);

module.exports = _.assign(exports, _);
