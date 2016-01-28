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
    describe('given the recorder is not linked to an account', function() {
      it('should update the recorder gcm_registration_token attribute.', function(done) {
        handler({
          Authorization: 'Bearer ' + token,
          api_key: _.fake.API_KEY,
          'Content-Type': 'application/vnd.api+json',
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

    describe('given the recorder is linked to an account with a device group', function() {
      var account, receiver;

      before(function() {
        return _.fake.accountDeviceGroup().then(function(adg) {
          account = adg.account;
          receiver = adg.receiver;
        });
      });

      describe('and the recorder already had a gcm_registration_token', function() {
        it('should replace the recorder\'s old toke with the recorder\'s new token in the existing device group', function(done) {
          var oldToken = receiver.gcm_registration_token;
          var newToken = _.token(64);
          var recorderID = receiver.recorder_id;

          handler({
            Authorization: 'Bearer ' + receiver.at,
            api_key: _.fake.API_KEY,
            'Content-Type': 'application/vnd.api+json',
            recorder_id: recorderID,
            body: {
              data: {
                type: 'recorders',
                id: recorderID,
                attributes:  {
                  gcm_registration_token: newToken,
                },
              },
            },
          }, {
            succeed: function() {
              //check GCM has been updated
              var group = _.gcm.store[account.gcm_notification_key];
              expect(group).to.deep.equal([newToken]);

              //check the token has been updated in the db
              _.recorders.get(receiver.recorder_client_id)
                .then(function(recorder) {
                  expect(recorder).to.have.property('gcm_registration_token', newToken);
                  done();
                })
                .catch(done);
            },
            fail: done,
          });
        });
      });

      describe('and the recorder did not previously have a gcm_registration_token', function() {
        var recorder, recorderID;

        before(function() {
          return _.fake.recorder().then(function(_recorder) {
            recorder = _recorder.recorder;
            recorderID = recorder.recorder_id;

            return _.receivers.link(recorderID, account.account_id);
          });
        });

        it('should add the recorder\'s token to the existing device group', function(done) {
          var newToken = _.token(64);

          handler({
            Authorization: 'Bearer ' + _.jwt.creds(null, recorderID),
            api_key: _.fake.API_KEY,
            'Content-Type': 'application/vnd.api+json',
            recorder_id: recorderID,
            body: {
              data: {
                type: 'recorders',
                id: recorderID,
                attributes:  {
                  gcm_registration_token: newToken,
                },
              },
            },
          }, {
            succeed: function() {
              var group = _.gcm.store[account.gcm_notification_key];
              expect(group[1]).to.equal(newToken);

              _.recorders.get(recorder.recorder_client_id)
                .then(function(_recorder) {
                  expect(_recorder).to.have.property('gcm_registration_token', newToken);
                  done();
                });
            },
            fail: done,
          });
        });
      });
    });

    describe('given the recorder is linked to an account without a device group', function() {
      var account, recorder, recorderID;

      before(function() {
        return Promise.all([
            _.fake.account(),
            _.fake.recorder(),
          ])
          .then(function(results) {
            account = results[0];
            recorder = results[1].recorder;
            recorderID = recorder.recorder_id;

            return _.receivers.link(recorderID, account.account_id);
          });
      });

      it('should create a device group with the new token.', function(done) {
        var newToken = _.token(64);

        handler({
          Authorization: 'Bearer ' + _.jwt.creds(null, recorderID),
          api_key: _.fake.API_KEY,
          'Content-Type': 'application/vnd.api+json',
          recorder_id: recorderID,
          body: {
            data: {
              type: 'recorders',
              id: recorderID,
              attributes:  {
                gcm_registration_token: newToken,
              },
            },
          },
        }, {
          succeed: function() {
            return _.accounts.get(account.email)
              .then(function(_account) {
                var notificationKey = _account.gcm_notification_key;
                var group = _.gcm.store[notificationKey];

                expect(notificationKey).to.be.ok;
                expect(group[0]).to.equal(newToken);

                //check the token was saved to the recorder
                return _.recorders.get(recorder.recorder_client_id)
                  .then(function(recorder) {
                    expect(recorder).to.have.property('gcm_registration_token', newToken);
                    done();
                  });
              })
              .catch(done);
          },
          fail: done,
        });
      });
    });
  });

  describe('unformatted request bodies', function() {
    describe('no data', function() {
      it('should fail with a Bad Request error', function(done) {
        handler({
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: {},
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err.message).to.equal('400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Missing required property: data',
            });
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
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err.message).to.equal('400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Missing required property: type',
            });
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
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err.message).to.equal('400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'String does not match pattern: ^recorders$',
            });
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
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err.message).to.equal('400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Missing required property: id',
            });
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
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err.message).to.equal('400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Missing required property: attributes',
            });
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
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Missing required property: gcm_registration_token',
            });
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
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Additional properties not allowed',
            });
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
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          recorder_id: recorder.recorder_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success without formatted body'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Additional properties not allowed',
            });
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
        'Content-Type': 'application/vnd.api+json',
        recorder_id: recorder.recorder_id,
        body: body,
      }, {
        succeed: function() {
          done(new Error('success without authorization'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.deep.equal({
            detail: 'Authorization header should be formatted: Bearer <JWT>'
          });
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
        'Content-Type': 'application/vnd.api+json',
        recorder_id: recorder.recorder_id,
        body: body,
      }, {
        succeed: function() {
          done(new Error('success with account only authorization'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.deep.equal({
            detail: 'Auth token is not valid for any recorder',
          });
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
        'Content-Type': 'application/vnd.api+json',
        recorder_id: recorder.recorder_id,
        body: body,
      }, {
        succeed: function() {
          done(new Error('success with mismatch auth and recorderID'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '403');
          expect(JSON.parse(err.name)).to.deep.equal({
            detail: 'Auth token is not valid for recorder ' + recorder.recorder_id,
          });
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
        'Content-Type': 'application/vnd.api+json',
        recorder_id: recorder.recorder_id,
        body: b,
      }, {
        succeed: function() {
          done(new Error('success with mismatched id'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '403');
          expect(JSON.parse(err.name)).to.deep.equal({
            detail: 'Auth token is not valid for recorder ' + otherRecorder.recorder.recorder_id,
          });
          done();
        },
      });
    });
  });

  describe('unsupported content-type', function() {
    it('should fail with an Unsupported error.', function(done) {
      handler({
        'Content-Type': 'application/json',
      }, {
        succeed: function() {
          done(new Error('success without jsonapi content type'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '415');
          done();
        },
      });
    });
  });
});
