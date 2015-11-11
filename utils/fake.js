var _ = require('./');

var API_KEY = exports.API_KEY = 'abc123';

exports.recorder = function() {
  var handler = require('../resources/recorder/post').handler;

  return new Promise(function(resolve, reject) {
    var clientID = _.token(12);

    handler({
      api_key: API_KEY,
      recorder: {
        recorder_client_id: clientID,
        description: 'Mocha',
      },
    }, {
      fail: function(err) {
        reject(new Error(err));
      },
      succeed: function(r) {
        resolve(r);
      }
    });
  });
};

var user = exports.user = function() {
  return {
    email: _.token(12) + '@mailinator.com',
    first_name: 'John',
    last_name: 'Doe',
    password: 'secret',
  };
};

exports.account = function(_user) {
  var register = require('../resources/accounts/post').handler;

  var u = _user || user();

  return new Promise(function(resolve, reject) {
    register({
      api_key: API_KEY,
      u: u,
    }, {
      fail: function(err) {
        reject(new Error(err));
      },
      succeed: function() {
        resolve(u);
      },
    });
  });
};
