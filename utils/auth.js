var util = require('util');
var _ = require('lodash');
var http = require('./http');
var conf = require('./conf.js');
var recorderOnly = /^peppermint recorder=[\w\+\/]+={0,2}$/i;
var accountOnly = /^peppermint account=[\w\+\/]+={0,2}$/i;
var recorderAccount = /^peppermint recorder=[\w\+\/]+={0,2}, account=[\w\+\/]+={0,2}$/i;
var accountRecorder = /^peppermint account=[\w\+\/]+={0,2}, recorder=[\w\+\/]+={0,2}$/i;
var googleOnly = /^peppermint google=[\w\+\/]+={0,2}$/i;
var googleRecorder = /^peppermint google=[\w\+\/]+={0,2}, recorder=[\w\+\/]+={0,2}$/i;
var recorderGoogle = /^peppermint recorder=[\w\+\/]+={0,2}, google=[\w\+\/]+={0,2}$/i;
var facebookOnly = /^peppermint facebook=[\w\+\/]+={0,2}$/i;
var facebookRecorder = /^peppermint facebook=[\w\+\/]+={0,2}, recorder=[\w\+\/]+={0,2}$/i;
var recorderFacebook = /^peppermint recorder=[\w\+\/]+={0,2}, facebook=[\w\+\/]+={0,2}$/i;

exports.isValid = function(authHeader) {
  if (typeof authHeader !== 'string') {
    return false;
  }

  return recorderOnly.test(authHeader) ||
    accountOnly.test(authHeader) ||
    recorderAccount.test(authHeader) ||
    accountRecorder.test(authHeader) ||
    googleOnly.test(authHeader) ||
    googleRecorder.test(authHeader) ||
    recorderGoogle.test(authHeader) ||
    facebookOnly.test(authHeader) ||
    facebookRecorder.test(authHeader) ||
    recorderFacebook.test(authHeader);
};

var recorderCreds = /recorder=[\w\+\/]+={0,2}/;
var accountCreds = /account=[\w\+\/]+={0,2}/;
var googleCreds = /google=[\w\+\/]+={0,2}/;
var facebookCreds = /facebook=[\w\+\/]+={0,2}/;

var encodedCreds = exports.encodedCreds = function(authHeader) {
  var recorder = authHeader.match(recorderCreds);
  var account = authHeader.match(accountCreds);
  var google = authHeader.match(googleCreds);
  var facebook = authHeader.match(facebookCreds);

  return {
    recorder: recorder && recorder[0].substring(recorder[0].indexOf('=') + 1),
    account: account && account[0].substring(account[0].indexOf('=') + 1),
    google: google && google[0].substring(google[0].indexOf('=') + 1),
    facebook: facebook && facebook[0].substring(facebook[0].indexOf('=') + 1),
  };
};

var creds = exports.creds = function(encodedCreds) {
  return {
    recorder: encodedCreds.recorder && Buffer(encodedCreds.recorder, 'base64').toString('utf8'),
    account: encodedCreds.account && Buffer(encodedCreds.account, 'base64').toString('utf8'),
    google: encodedCreds.google && Buffer(encodedCreds.google, 'base64').toString('utf8'),
    facebook: encodedCreds.facebook && Buffer(encodedCreds.facebook, 'base64').toString('utf8'),
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

exports.google = function(creds) {
  var email = creds.user;
  var accessToken = creds.password;

  return http.get('https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken)
    .then(function(response) {
      if (response.statusCode === 403 || response.statusCode === 401) {
        var err = new Error('401');
        err.name = JSON.stringify({detail: 'Google rejected access token'});
        throw err;
      }
      if (response.statusCode !== 200 && conf.NODE_ENV === 'production') {
        console.log(util.inspect(response.body, {depth: null}));
        throw new Error(response.statusCode);
      }
      //https://developers.google.com/+/web/api/rest/latest/people#resource
      var profile = response.body;
      if (!profile.emails || !profile.emails.length) {
        var err = new Error('400');
        err.name = JSON.stringify({detail: 'Access token does not have emails in scope'});
        throw err;
      }
      var match = _.find(profile.emails, function(obj) {
        return obj.value.toLowerCase() === email.toLowerCase();
      });
      if (!match) {
        throw new Error('email does not match Google profile');
      }
      return {
        email: email.toLowerCase(),
        full_name: profile.displayName || email,
        source: 'google',
      };
    });
};

/*
 * Facebook returns a single email so we don't technically need to pass in the
 * email but we do for consistency with the Google routine.
 */
exports.facebook = function(creds) {
  var email = creds.user;
  var accessToken = creds.password;
  if (!email) {
    return Promise.reject(new Error('email is required'));
  }

  return http.get('https://graph.facebook.com/me?access_token=' + accessToken)
    .then(function(response) {
      if (response.statusCode === 400) {
        var err = new Error('401');
        err.name = JSON.stringify({detail: 'Facebook rejected access token'});
        throw err;
      }
      if (response.statusCode !== 200 && conf.NODE_ENV === 'production') {
        console.log(util.inspect(response.body, {depth: null}));
        throw new Error(response.statusCode);
      }
      //https://developers.facebook.com/docs/graph-api/reference/user
      var profile = response.body;
      if (!profile.email) {
        var err = new Error('400');
        err.name = JSON.stringify({detail: 'Access token does not include email scope'});
        throw err;
      }
      if (profile.email !== email) {
        var err = new Error('401');
        err.name = JSON.stringify({detail: 'Email does not match Facebook profile'});
        throw err;
      }

      return {
        email: profile.email,
        full_name: profile.name,
        source: 'facebook',
      };
    });
};
