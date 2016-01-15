var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:Authenticate', function() {
  var recorder, account;
  var recorderUser, recorderPass, accountUser, accountPass;

  before(function() {
    return Promise.all([
      _.fake.recorder(),
      _.fake.account(),
    ]).then(function(results) {
      recorder = results[0].recorder;
      account = results[1];
      recorderUser = recorder.recorder_client_id;
      recorderPass = recorder.recorder_key;
      accountUser = account.email;
      accountPass = account.password;
    });
  });

  describe('valid requests', function() {
    describe('recorder credentials only', function() {
      it('should succeed.', function(done) {
        handler({
          Authorization: _.peppermintScheme(recorderUser, recorderPass),
          api_key: _.fake.API_KEY,
        }, {
          fail: function(err) {
            done(new Error(err));
          },
          succeed: function(result) {
            done();
          },
        });
      });
    });

    describe('account credentials only', function() {
      it('should succeed with a jwt.', function(done) {
        handler({
          Authorization: _.peppermintScheme(null, null, accountUser, accountPass),
          api_key: _.fake.API_KEY,
        }, {
          fail: function(err) {
            done(new Error(err));
          },
          succeed: function(result) {
            done();
          },
        });
      });
    });

    describe('recorder and account credentials', function() {
      it('should succeed with a jwt.', function(done) {
        handler({
          Authorization: _.peppermintScheme(recorderUser, recorderPass, accountUser, accountPass),
          api_key: _.fake.API_KEY,
        }, {
          fail: function(err) {
            done(new Error(err));
          },
          succeed: function(result) {
            done();
          },
        });
      });
    });
  });

  describe('unparseable Authorization headers', function() {
    it('should fail.', function(done) {
      handler({
        Authorization: 'Peppermint recorder=',
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error('success with bad Auth header'));
        },
        fail: function(err) {
          expect(err).to.match(/^Bad Request/);
          done();
        },
      });
    });
  });
});
