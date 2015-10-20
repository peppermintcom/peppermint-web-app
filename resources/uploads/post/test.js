var expect = require('chai').expect;
var fake = require('utils/fake');
var handler = require('./').handler;

describe('lambda:CreateUpload', function() {
  var jwt, recorder;

  before(function() {
    return fake.recorder().then(function(res) {
      jwt = res.at;
      recorder = res.recorder;
    });
  });

  it('should return a signed_url for the peppermint-cdn bucket.', function(done) {
    handler({
      Authorization: 'Bearer ' + jwt,
      body: {
        contentType: 'audio/aac',
        recorder_id: recorder.recorder_id,
      },
    }, {
      fail: function(err) {
        done(new Error(err));
      },
      succeed: function(upload) {
        expect(upload).to.have.property('signed_url');
        done();
      },
    });
  });
});
