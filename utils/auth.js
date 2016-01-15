var _ = require('lodash');
var recorderOnly = /^peppermint recorder=[\w\+\/]+={0,2}$/i;
var accountOnly = /^peppermint account=[\w\+\/]+={0,2}$/i;
var recorderAccount = /^peppermint recorder=[\w\+\/]+={0,2}, account=[\w\+\/]+={0,2}$/i;
var accountRecorder = /^peppermint account=[\w\+\/]+={0,2}, recorder=[\w\+\/]+={0,2}$/i;

exports.isValid = function(authHeader) {
  if (typeof authHeader !== 'string') {
    return false;
  }

  return recorderOnly.test(authHeader) ||
    accountOnly.test(authHeader) ||
    recorderAccount.test(authHeader) ||
    accountRecorder.test(authHeader);
};

var recorderCreds = /recorder=[\w\+\/]+={0,2}/;
var accountCreds = /account=[\w\+\/]+={0,2}/;

var encodedCreds = exports.encodedCreds = function(authHeader) {
  var recorder = authHeader.match(recorderCreds);
  var account = authHeader.match(accountCreds);

  return {
    recorder: recorder && recorder[0].substring(recorder[0].indexOf('=') + 1),
    account: account && account[0].substring(account[0].indexOf('=') + 1),
  };
};

var creds = exports.creds = function(encodedCreds) {
  return {
    recorder: encodedCreds.recorder && Buffer(encodedCreds.recorder, 'base64').toString('utf8'),
    account: encodedCreds.account && Buffer(encodedCreds.account, 'base64').toString('utf8'),
  };
};

var credsObj = exports.credsObj = function(creds) {
  return _.mapValues(creds, function(v) {
    if (!v) {
      return null;
    }
    var splitIndex = v.indexOf(':');

    if (splitIndex < 1) {
      throw new Error(v);
    }

    return {
      user: v.substring(0, splitIndex),
      password: v.substring(splitIndex + 1),
    };
  });
};

exports.decode = _.flow(encodedCreds, creds, credsObj);
