var expect = require('chai').expect;
var tv4 = require('tv4');
var defs = require('definitions');
var handler = require('./').handler;
var spec = require('./spec');
var _ = require('utils/test');

const GOOGLE = 1;

describe('lambda:Authenticate', function() {
  var recorder, account;
  var recorderUser, recorderPass, accountUser, accountPass, receiver;

  before(function() {
    return Promise.all([
      _.fake.recorder(),
      _.fake.account(),
      _.fake.receiver(),
    ]).then(function(results) {
      recorder = results[0].recorder;
      account = results[1];
      receiver = results[2];
      recorderUser = recorder.recorder_client_id;
      recorderPass = recorder.recorder_key;
      accountUser = account.email;
      accountPass = account.password;
    });
  });

  describe('google', function() {
    //need to use an email you own
    var email = 'andrew@areed.io';
    var name = 'Andrew Reed';
    //https://developers.google.com/oauthplayground
    var accessToken = 'ya29.fQK-Sy8ZpOl10IW1iiqVoZ-9Y7yC0pWsaCRG8RhISg-xKaaTACd0A2m9DtMRjMI1XrQq';

    describe('account does not exist', function() {
      var result, accountID;

      before(function() {
        return _.accounts.del(email);
      });

      before(function(done) {
        handler({
          Authorization: _.peppermintScheme(null, null, email, accessToken, GOOGLE),
          api_key: _.fake.API_KEY,
        }, {
          succeed: function(_result) {
            result = _result;
            done();
          },
          fail: done,
        });
      });

      it('should succeed with a jwt.', function() {
        if (!tv4.validate(result, spec.responses['200'])) {
          throw tv4.error;
        }
        var jwt = _.jwt.verify(result.data.attributes.token);
        expect(jwt).to.have.property('account_id');
        accountID = jwt.account_id;
      });

      it('should include a new account.', function() {
        if (!tv4.validate(result.included[0], defs.accounts.schema)) {
          throw tv4.error;
        }
        expect(result.included[0].id).to.equal(accountID);
      });
    });

    describe('account exists', function() {
      var result, account;

      before(function() {
        return _.accounts.upsert({
          email: email,
          full_name: name,
          source: 'Mocha',
          email_is_verified: true,
        })
        .then(function(_account) {
          account = _account;
        });
      });

      //is a dependency for following "it" blocks
      it('should succeed with a JWT.', function(done) {
        handler({
          Authorization: _.peppermintScheme(null, null, email, accessToken, GOOGLE),
          api_key: _.fake.API_KEY,
        }, {
          succeed: function(_result) {
            result = _result;
            expect(result.data.attributes.token).to.be.ok;
            done();
          },
          fail: done,
        });
      });

      it('should include the account.', function() {
        var includedAccount = result.included[0];

        if (!tv4.validate(includedAccount, defs.accounts.schema)) {
          throw tv4.error;
        }
        expect(includedAccount.id).to.equal(account.account_id);
        expect(includedAccount.attributes).to.have.property('email', account.email);
      });
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
          fail: done,
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

      describe('recorder is registered with GCM.', function() {
        it('should succeed and include gcm_registration_token in recorder resource', function(done) {
          handler({
            Authorization: _.peppermintScheme(receiver.recorder_client_id, receiver.recorder_key),
            api_key: _.fake.API_KEY,
          }, {
            fail: done,
            succeed: function(result) {
              expect(result.included[0].attributes).to.have.property('gcm_registration_token', receiver.gcm_registration_token);
              done();
            },
          });
        });
      });
    });

    describe('account credentials only', function() {
      it('should succeed with a jwt.', function(done) {
        handler({
          Authorization: _.peppermintScheme(null, null, accountUser, accountPass),
          api_key: _.fake.API_KEY,
        }, {
          fail: done,
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
          fail: done,
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

    describe('given the recorder is a receiver for the account', function() {
      before(function() {
        return _.receivers.link(receiver.recorder_id, account.account_id);
      });

      it('should include the relationship on the account resource.', function(done) {
        handler({
          Authorization: _.peppermintScheme(receiver.recorder_client_id, receiver.recorder_key, accountUser, accountPass),
          api_key: _.fake.API_KEY,
        }, {
          fail: done,
          succeed: function(result) {
            var account = _.find(result.included, function(resource) {
              return resource.type === 'accounts';
            });
            var recorder = _.find(result.included, function(resource) {
              return resource.type === 'recorders';
            });
            expect(account.relationships).to.deep.equal({
              receivers: {data: [{type: 'recorders', id: receiver.recorder_id}]},
            });
            expect(recorder.attributes).to.have.property('gcm_registration_token', receiver.gcm_registration_token);
            done();
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
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header required');
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
          expect(err).to.have.property('message', '400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header does not follow Peppermint scheme');
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
          expect(err).to.have.property('message', '404');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Account not found');
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
            expect(err).to.have.property('message', '404');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Account not found');
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
          expect(err).to.have.property('message', '404');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Recorder not found');
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
            expect(err).to.have.property('message', '404');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Recorder not found');
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
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'account password');
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
            expect(err).to.have.property('message', '401');
            expect(JSON.parse(err.name)).to.have.property('detail', 'account password');
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
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'recorder key');
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
            expect(err).to.have.property('message', '401');
            expect(JSON.parse(err.name)).to.have.property('detail', 'recorder key');
            done();
          },
        });
      });
    });
  });
});
