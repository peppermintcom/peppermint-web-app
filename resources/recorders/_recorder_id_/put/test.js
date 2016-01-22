var expect = require('chai').expect;
var handler = require('.').handler;
var _ = require('utils/test');

describe('lambda:UpdateRecorder', function() {
  var gcmToken = _.token(14);
  var token, recorder, otherRecorder, account, body;

  before(function() {
    return Promise.all([
      _.fake.recorder(),
      _.fake.recorder(),
      _.fake.account(),
    ])
    .then(function(results) {
      token = results[0].at;
      recorder = results[0].recorder;
      otherRecorder = results[1];
      account = results[2];

      body = {
        data: {
          type: 'recorders',
          id: recorder.recorder_id,
          attributes:  {
            gcm_registration_token: gcmToken,
          },
        },
      };
    });
  });

  describe('valid requests', function() {
    it('should update the recorder gcm_registration_token attribute.', function(done) {
      handler({
        Authorization: 'Bearer ' + token,
        api_key: _.fake.API_KEY,
        recorder_id: recorder.recorder_id,
        body: body,
      }, {
        succeed: done,
        fail: function(err) {
          done(new Error(err));
        },
      });
    });
  });

  describe('unformatted request bodies', function() {
    describe('no data', function() {
      it('should fail with a Bad Request error', function(done) {
        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: {},
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*data/);
            done();
          },
        });
      });
    });

    describe('no data.type', function() {
      it('should fail with a Bad Request error.', function(done) {
        var b = _.cloneDeep(body);
        delete b.data.type;

        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*type/);
            done();
          },
        });
      });
    });

    describe('wrong data.type', function() {
      it('should fail with a Bad Request error.', function(done) {
        var b = _.cloneDeep(body);
        b.data.type = 'recorder';

        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*recorder/);
            done();
          },
        });
      });
    });

    describe('no data.id', function() {
      it('should fail with a Bad Request error.', function(done) {
        var b = _.cloneDeep(body);
        delete b.data.id;

        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*id/);
            done();
          },
        });
      });
    });

    describe('no data.attributes', function() {
      it('should fail with a Bad Request error.', function(done) {
        var b = _.cloneDeep(body);
        delete b.data.attributes;

        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*attributes/);
            done();
          },
        });
      });
    });

    describe('no data.attributes.gcm_registration_token', function() {
      it('should fail with a Bad Request error.', function(done) {
        var b = _.cloneDeep(body);
        delete b.data.attributes.gcm_registration_token;

        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*gcm_registration_token/);
            done();
          },
        });
      });
    });

    describe('extra data properties', function() {
      it('should fail with a Bad Request error.', function(done) {
        var b = _.cloneDeep(body);
        b.data.recorder_client_id = 'hello';

        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request/);
            done();
          },
        });
      });
    });

    describe('extra data.attributes', function() {
      it('should fail with a Bad Request error.', function(done) {
        var b = _.cloneDeep(body);
        b.data.attributes.recorder_client_id = 'hello';

        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request/);
            done();
          },
        });
      });
    });
  });

  describe('missing Authorization', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        recorder_id: recorder.recorder_id,
        body: body,
      }, {
        succeed: function() {
          done(new Error('success without authorization'));
        },
        fail: function(err) {
          expect(err).to.match(/^Unauthorized/);
          done();
        },
      });
    });
  });

  describe('authenticated as account only', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + account.at,
        recorder_id: recorder.recorder_id,
        body: body,
      }, {
        succeed: function() {
          done(new Error('success with account only authorization'));
        },
        fail: function(err) {
          expect(err).to.match(/^Unauthorized/);
          done();
        },
      });
    });
  });

  describe('authenticated for a different recorder', function() {
    it('should fail with a Forbidden error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + otherRecorder.at,
        recorder_id: recorder.recorder_id,
        body: body,
      }, {
        succeed: function() {
          done(new Error('success with mismatch auth and recorderID'));
        },
        fail: function(err) {
          expect(err).to.match(/^Forbidden/);
          done();
        },
      });
    });
  });

  describe('data.id does not match authentication', function() {
    it('should fail with a Forbidden error.', function(done) {
      var b = _.cloneDeep(body);
      b.data.id = otherRecorder.recorder.recorder_id;

      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + token,
        recorder_id: recorder.recorder_id,
        body: b,
      }, {
        succeed: function() {
          done(new Error('success with mismatched id'));
        },
        fail: function(err) {
          expect(err).to.match(/^Forbidden/);
          done();
        },
      });
    });
  });
});
