var _ = require('./');

_.gcm = require('./gcmstub');

var API_KEY = exports.API_KEY = 'abc123';
var AUDIO_URL = exports.AUDIO_URL = 'http://go.peppermint.com/x/x.m4a';

var recorder = exports.recorder = function() {
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

exports.recorder2 = function() {
  return recorder().then(function(recorder) {
    recorder.recorder.at = recorder.at;
    return recorder.recorder;
  });
};

var receiver = exports.receiver = function(_recorder) {
  var gcmToken = _.token(64);

  return (_recorder ? Promise.resolve(_recorder) : recorder())
    .then(function(recorder) {
      return _.recorders.updateByID(recorder.recorder.recorder_id, {
        gcm_registration_token: {S: gcmToken},
      })
      .then(function() {
        recorder.recorder.at = recorder.at;
        recorder.recorder.gcm_registration_token = gcmToken;
        return recorder.recorder;
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

var account = exports.account = function(_user) {
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

exports.transcription = function(recorderID, id) {
  var id = id || _.token(22);
  var recorderID = recorderID || _.token(22);

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
