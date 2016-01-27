var _ = require('./');

_.gcm = require('./gcmstub');

var API_KEY = exports.API_KEY = 'abc123';
//iOS
var GCM_TOKEN = exports.GCM_TOKEN = 'nUYQX9xzZ5o:APA91bEi2YWlmr6sA8WDiBjl1gN_NRVxQOr1AUr6wtij8p9rqtPwUENoVSaCxhYPzfxl7eReXli9ArzZ08MxHGn-hdNPJioRDw03ZpZiz3hMoVwSNiZBSLVLDSZJLr841x2sCmxuFi9e';
var GCM_TOKEN2 = exports.GCM_TOKEN2 = 'lJexXiB4F9Q:APA91bEBhxanW0D48Yj-7DPvAHz8Bh7JyrDfRRDZqMxT8pB_o1Helo5syJMn6ZUdh8fUH0ZXI97zuT5jc-HjZvcAMW1aVWPZkK-DTn1bXQ_KkNrtHTD_0bB-028C9j_0QDNY-2MNQsyJ';

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

var receiver = exports.receiver = function(_recorder) {
  return (_recorder ? Promise.resolve(_recorder) : recorder())
    .then(function(recorder) {
      return _.recorders.update(recorder.recorder.recorder_id, {
        gcm_registration_token: {S: GCM_TOKEN2},
      })
      .then(function() {
        recorder.recorder.at = recorder.at;
        recorder.recorder.gcm_registration_token = GCM_TOKEN2;
        return recorder.recorder;
      });
    });
};

exports.accountDeviceGroup = function(_receiver, _account) {
  return Promise.all([
      _receiver ? Promise.resolve(_receiver) : receiver(),
      _account ? Promise.resolve(_account) : account(),
    ])
    .then(function(results) {
      var receiver = results[0];
      var account = results[1];

      return _.gcm.createDeviceGroup(account.email, receiver.gcm_registration_token)
        .then(function(result) {
          return _.accounts.update(account.email.toLowerCase(), {gcm_notification_key: {S: result.notification_key}});
        })
        .then(function(res) {
          return {
            account: account,
            receiver: receiver,
          };
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
