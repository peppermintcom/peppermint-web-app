var expect = require('chai').expect;
var register = require('../../recorder/post').handler;
var handler = require('./').handler;
var _ = require('utils');

describe('recorder-token', function() {
  var clientID = _.token(12);
  var recorder;

  before(function(done) {
    register({
      api_key: 'abc123',
      recorder: {
        recorder_client_id: clientID,
      },
    }, {
      fail: done,
      succeed: function(r) {
        recorder = r.recorder;
        done();
      },
    });
  });

  it ('should return a JWT.', function(done) {
    var Authorization = 'Basic ' + new Buffer(clientID + ':' + recorder.recorder_key).toString('base64');

    handler({
      Authorization: Authorization,
    }, {
      succeed: function(r) {
        expect(r).to.have.property('at');
        expect(r).to.have.property('recorder');
        expect(r.recorder).to.have.property('recorder_id', recorder.recorder_id);
        expect(r.recorder).to.have.property('recorder_client_id', recorder.recorder_client_id);
        expect(r.recorder).to.have.property('recorder_ts', recorder.recorder_ts);
        var jwt = _.jwtVerify(r.at);
        expect(jwt).to.have.property('recorder_id', recorder.recorder_id);
        done();
      },
      fail: function(err) {
        done(new Error(err));
      },
    });
  });

  describe('Unknown recorder_client_id', function() {
    it('should return an Unauthorized error.', function(done) {
      var Authorization = 'Basic ' + new Buffer(clientID + 'x:' + recorder.recorder_key).toString('base64');

      handler({
        Authorization: Authorization,
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized.*recorder_client_id/);
          done();
        },
        succeed: function(r) {
          done(new Error('success with bad clientID!'));
        },
      });
    });
  });

  describe('Wrong recorder_key', function() {
    it('should return an Unauthorized error.', function(done) {
      var Authorization = 'Basic ' + new Buffer(clientID + ':x' + recorder.recorder_key).toString('base64');

      handler({
        Authorization: Authorization,
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized.*recorder_key/);
          done();
        },
        succeed: function(r) {
          done(new Error('success with wrong recorder_key!'));
        },
      });
    });
  });
});
