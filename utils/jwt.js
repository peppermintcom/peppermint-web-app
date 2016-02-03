var jwt = require('jwt-simple');
var errors = require('./errors');
var conf = require('./conf');

const JWT_SECRET = conf.PEPPERMINT_JWT_SECRET;

if (JWT_SECRET.length < 40) {
  throw new Error('set env var PEPPERMINT_JWT_SECRET to a string 40 characters long');
}

/**
 * Sign a claims set.
 * @param {String} subject
 * @param {Number} term - number of seconds until expiration
 * @return {String}
 */
var encode = exports.encode = function(subject, term, id) {
  var now = Math.floor(Date.now() / 1000);
  var payload = {
    exp: now + term,
    iat: now,
    iss: 'peppermint.com',
    sub: subject,
  };

  if (id) {
    payload.id = id;
  }

  return jwt.encode(payload, JWT_SECRET);
};

/**
 * Parse and validate JWT claims.
 * @param {String} token
 * @return {Object}
 */
var decode = exports.decode = function(token) {
  var r = {};

  try {
    r.payload = jwt.decode(token, JWT_SECRET);
  } catch(e) {
    r.err = e;
    return r;
  }

  if (r.payload.exp < Math.ceil(Date.now() / 1000)) {
    r.err = errors.EXPIRED;
    return r;
  }

  if (r.payload.iss !== 'peppermint.com') {
    r.err = new Error('Unknown Issuer: ' + r.payload.iss);
    return r;
  }

  return r;
};

/**
 * Sign a jwt for an account and/or recorder.
 * @param {String} account_id
 * @param {String} recorder_id
 * @return {String}
 */
exports.creds = (function() {
  var month = 30 * 60 * 60 * 24;

  return function(account_id, recorder_id, id) {
    return encode([account_id || '', recorder_id || ''].join('.'), month, id);
  };
})();

var verify = exports.verify = function(token) {
  var r = decode(token);

  if (r.err) {
    return r;
  }

  //sub will be email or <account_id>.<recorder_id>
  if (/@/.test(r.payload.sub)) {
    r.email = r.payload.sub;
  } else {
    var creds = r.payload.sub.split('.');
    r.account_id = creds[0];
    r.recorder_id = creds[1];
  }

  return r;
};

//parse and decode
exports.claims = function(token) {
  var segments = token.split('.');
  
  return JSON.parse(Buffer(segments[1], 'base64').toString('utf8'));
};
