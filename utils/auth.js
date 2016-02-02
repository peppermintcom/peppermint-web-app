var util = require('util');
var _ = require('lodash');
var http = require('./http');
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

exports.google = function(email, accessToken) {
  return http.get('https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken)
    .then(function(response) {
      if (response.statusCode !== 200) {
        throw new Error(response.statusCode);
      }
      //https://developers.google.com/+/web/api/rest/latest/people#resource
      var profile = response.body;
      var match = _.find(profile.emails, function(obj) {
        return obj.value.toLowerCase() === email.toLowerCase();
      });
      if (!match) {
        throw new Error('email does not match Google profile');
      }
      return {
        email: email.toLowerCase(),
        full_name: profile.displayName,
      };
    });
};

/*
 * Facebook returns a single email so we don't technically need to pass in the
 * email but we do for consistency with the Google routine.
 */
exports.facebook = function(email, accessToken) {
  console.log('email', email);
  console.log('accessToken', accessToken);
  if (!email) {
    return Promise.reject(new Error('email is required'));
  }

  return http('GET', 'https://graph.facebook.com/me?access_token=' + accessToken)
    .then(function(profile) {
      if (response.statusCode !== 200) {
        console.log(util.inspect(response.body, {depth: null}));
        throw new Error(response.statusCode);
      }
      //https://developers.facebook.com/docs/graph-api/reference/user
      var profile = response.body;
      if (profile.email !== email) {
        throw new Error('email does not match Facebook profile');
      }

      return {
        email: profile.email,
        full_name: profile.name,
      };
    });
};
