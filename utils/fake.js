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
    full_name: 'John Doe',
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
      succeed: function(r) {
        u.account_id = r.u.account_id;
        u.registration_ts = r.u.registration_ts;
        u.at = r.at;
        resolve(u);
      },
    });
  });
};

exports.transcription = function() {
  var id = _.token(22);
  var recorderID = _.token(22);

  var tx = {
    id: id,
    recorderID: recorderID,
    language: 'en-US',
    confidence: Math.random(),
    ts: new Date(),
    ip: '127.0.0.1',
    api_key: API_KEY,
    audio_url: ['http://go.peppermint.com', recorderID, id].join('/'),
    text: 'fake transcription text',
  };

  return _.transcriptions.put(tx).then(function() {
    return tx;
  });
};
