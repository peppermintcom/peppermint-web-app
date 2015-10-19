var _ = require('./');

const APP_API_KEY = 'abc123';

exports.recorder = function() {
  var handler = require('../resources/recorder/post').handler;

  return new Promise(function(resolve, reject) {
    var clientID = _.token(12);

    handler({
      api_key: APP_API_KEY,
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
