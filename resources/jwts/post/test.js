var expect = require('chai').expect;
var tv4 = require('tv4');
var defs = require('definitions');
var handler = require('./').handler;
var spec = require('./spec');
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
    var schema = spec.responses['200'].schema;

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
            expect(result.data.relationships).not.to.have.property('account');
            expect(result.data.relationships).to.have.property('recorder');
            expect(result.data.relationships.recorder.id).to.equal(recorder.recorder_id);
            expect(result.included).to.have.length(1);
            if (!tv4.validate(result.included[0], defs.recorders.schemaNoKey)) {
              return done(tv4.error);
            }
            done(tv4.validate(result, schema) ? null : tv4.error);
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
            expect(result.data.relationships).not.to.have.property('recorder');
            expect(result.data.relationships).to.have.property('account');
            expect(result.data.relationships.account.id).to.equal(account.account_id);
            expect(result.included).to.have.length(1);
            if (!tv4.validate(result.included[0], defs.accounts.schema)) {
              return done(tv4.error);
            }
            done(tv4.validate(result, schema) ? null : tv4.error);
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
            expect(result.data.relationships).to.have.property('recorder');
            expect(result.data.relationships).to.have.property('account');
            expect(result.data.relationships.recorder.id).to.equal(recorder.recorder_id);
            expect(result.data.relationships.account.id).to.equal(account.account_id);
            expect(result.included).to.have.length(2);
            done(tv4.validate(result, schema) ? null : tv4.error);
          },
        });
      });
    });
  });

  describe('missing Authorization header', function() {
    it('should fail with a Bad Request error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error("success without Authorization"));
        },
        fail: function(err) {
          expect(err).to.match(/^Bad Request/);
          done();
        },
      });
    });
  });

  describe('unparseable Authorization headers', function() {
    it('should fail with a Bad Request error.', function(done) {
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

  describe('unregistered account', function() {
    it('should fail with a Not Found error.', function(done) {
      handler({
        Authorization: _.peppermintScheme(null, null, 'x' + accountUser, accountPass),
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error("success with unregistered account"));
        },
        fail: function(err) {
          expect(err).to.match(/^Not Found.*account/);
          done();
        },
      });
    });

    describe('with registered recorder', function() {
      it('should fail with a Not Found error.', function(done) {
        handler({
          Authorization: _.peppermintScheme(recorderUser, recorderPass, 'x' + accountUser, accountPass),
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error("success with unregistered account"));
          },
          fail: function(err) {
            expect(err).to.match(/^Not Found.*account/);
            done();
          },
        });
      });
    });
  });

  describe('unregistered recorder', function() {
    it('should fail with a Not Found error.', function(done) {
      handler({
        Authorization: _.peppermintScheme('x' + recorderUser, recorderPass),
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error("success with unregistered recorder"));
        },
        fail: function(err) {
          expect(err).to.match(/^Not Found.*recorder/);
          done();
        },
      });
    });

    describe('with a registered account.', function() {
      it('should fail with a Not Found error.', function(done) {
        handler({
          Authorization: _.peppermintScheme('x' + recorderUser, recorderPass, accountUser, accountPass),
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error("success with unregistered recorder"));
          },
          fail: function(err) {
            expect(err).to.match(/^Not Found.*recorder/);
            done();
          },
        });
      });
    });
  });

  describe('incorrect account password', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        Authorization: _.peppermintScheme(null, null, accountUser, 'x' + accountPass),
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error("success with incorrect account password"));
        },
        fail: function(err) {
          expect(err).to.match(/^Unauthorized.*account/);
          done();
        },
      });
    });

    describe('with correct recorder credentials', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          Authorization: _.peppermintScheme(recorderUser, recorderPass, accountUser, 'x' + accountPass),
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error("success with an incorrect account password"));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized.*account/);
            done();
          },
        });
      });
    });
  });

  describe('incorrect recorder key', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        Authorization: _.peppermintScheme(recorderUser, 'x' + recorderPass),
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error("success with incorrect recorder key"));
        },
        fail: function(err) {
          expect(err).to.match(/^Unauthorized.*recorder/);
          done();
        },
      });
    });

    describe('with correct account password', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          Authorization: _.peppermintScheme(recorderUser, 'x' + recorderPass, accountUser, accountPass),
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error("success with incorrect recorder key"));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized.*recorder/);
            done();
          },
        });
      });
    });
  });
});
