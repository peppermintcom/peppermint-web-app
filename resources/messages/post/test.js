var expect = require('chai').expect;
var tv4 = require('tv4');
var handler = require('./').handler;
var spec = require('./spec');
var _ = require('utils/test');

describe('lambda:CreateMessage', function() {
  var sender, recipient, body;
  var duration = 6;

  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.account(),
    ])
    .then(function(results) {
      sender = results[0];
      recipient = results[1];

      body = {
        data: {
          type: 'messages',
          attributes: {
            sender_email: sender.email,
            recipient_email: recipient.email,
            audio_url: _.fake.AUDIO_URL,
          },
        },
      };
    });
  });

  //set duration on upload so the send happens
  before(function() {
    return _.uploads.updateByAudioURL(_.fake.AUDIO_URL, 'SET seconds = :seconds, postprocessed = :postprocessed', {
      ':seconds': {N: '6'},
      ':postprocessed': {N: Date.now().toString()},
    });
  });

  describe('recipient has no recorders linked to account', function() {
    it('should fail with a 404 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + sender.at,
        'Content-Type': 'application/vnd.api+json',
        body: body,
      }, {
        succeed: function() {
          done(new Error('success without recipient receiver'));
        },
        fail: function(err) {
          expect(err.message).to.equal('404');
          expect(JSON.parse(err.name)).to.deep.equal({
            detail: 'Recipient cannot receive messages via Peppermint',
          });
          done();
        },
      });
    });
  });

  describe('recipient has 1 recorder linked to account', function() {
    var recorder;

    before(function() {
      return _.fake.recorder().then(function(_recorder) {
        recorder = _recorder.recorder;

        return _.receivers.link(recorder.recorder_id, recipient.account_id);
      });
    });

    after(function() {
      return _.receivers.unlink(recorder.recorder_id, recipient.account_id);
    });

    describe('recorder does not have a gcm_registration_token', function() {
      it('should fail with a 404 error.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success without recipient receiver'));
          },
          fail: function(err) {
            expect(err.message).to.equal('404');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Recipient cannot receive messages via Peppermint',
            });
            done();
          },
        });
      });
    });

    describe('recorder has valid gcm_registration_token', function() {
      var gcmToken = _.token(64);
      var response;

      before(function() {
        return _.recorders.updateByID(recorder.recorder_id, {
          gcm_registration_token: {S: gcmToken},
        });
      });

      before(function() {
        _.gcm.good(gcmToken);
      });

      it('should succeed with a message resource.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function(result) {
            responseOK(result, body.data.attributes, duration);
            response = result;
            done();
          },
          fail: done,
        });
      });

      it('should have sent to GCM.', function() {
        var last = _.gcm.sends.pop();
        msgOK(last, gcmToken, sender.full_name, response, duration);
      });

      it('should marrk the message delivered.', function() {
        return _.messages.get(response.id).then(function(message) {
          expect(message).to.have.property('handled_by', _.messages.handlers.CREATE_MESSAGE);
          expect(message).to.have.property('handled');
          expect(message).to.have.property('outcome');
        });
      });

      describe('no upload for audio_url', function() {
        it('should fail with a 400 error.', function(done) {
          var b = _.cloneDeep(body);
          b.data.attributes.audio_url = _.fake.AUDIO_URL + 'x';

          handler({
            api_key: _.fake.API_KEY,
            Authorization: 'Bearer ' + sender.at,
            'Content-Type': 'application/vnd.api+json',
            body: b,
          }, {
            succeed: function() {
              done(new Error('success without audio_url'));
            },
            fail: function(err) {
              expect(err.message).to.equal('400');
              expect(JSON.parse(err.name)).to.have.property('detail', 'No upload found at the audio_url');
              done();
            },
          });
        });
      });
    });

    describe('recorder has an old gcm_registration_token', function() {
      var gcmToken = _.token(64);
      var gcmResponse;
      var response;

      before(function() {
        return _.recorders.updateByID(recorder.recorder_id, {
          gcm_registration_token: {S: gcmToken},
        });
      });

      before(function() {
        gcmResponse = _.gcm.old(gcmToken);
      });

      it('should succeed with a message resource.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function(result) {
            responseOK(result, body.data.attributes, duration);
            response = result;
            done();
          },
          fail: done,
        });
      });

      it('should send a message to GCM.', function() {
        var last = _.gcm.sends.pop();
        msgOK(last, gcmToken, sender.full_name, response, duration);
      });

      it('should update the recorder registration token in the database to the one returned by GCM.', function() {
        return _.recorders.get(recorder.recorder_client_id)
          .then(function(recorder) {
            expect(recorder).to.have.property('gcm_registration_token', gcmResponse.results[0].registration_id);
          });
      });
    });

    describe('recorder has an invalid registration token', function() {
      var gcmToken = _.token(64);
      var gcmResponse;

      before(function() {
        return _.recorders.updateByID(recorder.recorder_id, {
          gcm_registration_token: {S: gcmToken},
        });
      });

      before(function() {
        gcmResponse = _.gcm.bad(gcmToken);
      });

      it('should fail with a 404 error.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success with single bad registration token'));
          },
          fail: function(err) {
            expect(err.message).to.equal('404');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Recipient cannot receive messages via Peppermint');
            done();
          },
        });
      });
    });
  });

  describe('recipient has 2 recorders linked to account', function() {
    var r1, r2;

    before(function() {
      return Promise.all([
          _.fake.recorder(),
          _.fake.recorder(),
        ])
        .then(function(results) {
          r1 = results[0].recorder;
          r2 = results[1].recorder;
        });
    });

    before(function() {
      return Promise.all([
          _.receivers.link(r1.recorder_id, recipient.account_id),
          _.receivers.link(r2.recorder_id, recipient.account_id),
        ]);
    });

    describe('neither has a gcm_registration_token', function() {
      it('should fail with a 404 error.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success without recipient receiver'));
          },
          fail: function(err) {
            expect(err.message).to.equal('404');
            expect(JSON.parse(err.name)).to.deep.equal({
              detail: 'Recipient cannot receive messages via Peppermint',
            });
            done();
          },
        });
      });
    });

    describe('1 has a valid gcm_registration_token, 1 has no token', function() {
      var r1Token = _.token(64);
      var ignore;
      var response;

      before(function() {
        _.gcm.good(r1Token);
        ignore = _.gcm.sends.length;
        return _.recorders.updateGCMToken(r1.recorder_client_id, r1Token);
      });

      it('should succeed with a message resource.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function(result) {
            responseOK(result, body.data.attributes, duration);
            response = result;
            done();
          },
          fail: done,
        });
      });

      it('should send 1 message to GCM.', function() {
        var msg = _.gcm.sends.pop();
        msgOK(msg, r1Token, sender.full_name, response, duration);
      });
    });

    describe('both have valid gcm_registration_tokens', function() {
      var r1Token = _.token(64);
      var r2Token = _.token(64);

      before(function() {
        _.gcm.good(r1Token);
        _.gcm.good(r2Token);

        while (_.gcm.sends.pop()) {}

        return Promise.all([
            _.recorders.updateGCMToken(r1.recorder_client_id, r1Token),
            _.recorders.updateGCMToken(r2.recorder_client_id, r2Token),
          ]);
      });

      describe('one is Android, one is iOS', function() {
        var response;

        before(function() {
          return Promise.all([
              _.recorders.update(r1.recorder_client_id, 'SET api_key = :key', {
                ':key': {S: _.fake.API_KEY_ANDROID},
              }),
              _.recorders.update(r2.recorder_client_id, 'SET api_key = :key', {
                ':key': {S: _.fake.API_KEY_IOS},
              }),
            ]);
        });

        after(function() {
          return _.recorders.update(r2.recorder_client_id, 'SET api_key = :key', {
            ':key': {S: _.fake.API_KEY_ANDROID},
          });
        });

        it('should succeed with a message resource.', function(done) {
          handler({
            api_key: _.fake.API_KEY,
            Authorization: 'Bearer ' + sender.at,
            'Content-Type': 'application/vnd.api+json',
            body: body,
          }, {
            succeed: function(result) {
              responseOK(result, body.data.attributes, duration);
              response = result;
              done();
            },
            fail: done,
          });
        });

        it('should send 3 messages to GCM.', function() {
          expect(_.gcm.sends).to.have.length(3);
        });

        it('message to Android should not have notification or content_available fields.', function() {
          var msg = _.find(_.gcm.sends, function(msg) {
            return msg.to === r1Token;
          });
          expect(msg).to.be.ok;
          msgOK(msg, r1Token, sender.full_name, response, duration);
        });

        it('should send a notification message and a data message to iOS', function() {
          var msgN = _.find(_.gcm.sends, function(msg) {
            return (msg.to === r2Token) && msg.notification;
          });
          var msgD = _.find(_.gcm.sends, function(msg) {
            return (msg.to === r2Token) && msg.data;
          });
          expect(msgN).to.be.ok;
          expect(msgD).to.be.ok;
          expect(msgN).not.to.equal(msgD);
          msgOK(msgD, r2Token, sender.full_name, response, duration);
          msgOKiOSNotification(msgN, sender.full_name);
        });
      });
    });

    describe('1 has a valid gcm_registration_token, 1 has expired token', function() {
      var r1Token = _.token(64);
      var r2Token = _.token(64);
      var gcmResponse;

      before(function() {
        _.gcm.good(r1Token);
        gcmResponse = _.gcm.old(r2Token);

        while (_.gcm.sends.pop()) {}

        return Promise.all([
            _.recorders.updateGCMToken(r1.recorder_client_id, r1Token),
            _.recorders.updateGCMToken(r2.recorder_client_id, r2Token),
          ]);
      });

      it('should succeed with a message resource.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function(result) {
            responseOK(result, body.data.attributes, duration);
            response = result;
            done();
          },
          fail: done,
        });
      });

      it('should send 2 message to GCM.', function() {
        expect(_.gcm.sends).to.have.length(2);
      });

      it('should send 1 message to the good token.', function() {
        var msg = _.find(_.gcm.sends, function(msg) {
          return msg.to === r1Token;
        });
        msgOK(msg, r1Token, sender.full_name, response, duration);
      });

      it('should send 1 message to the old token.', function() {
        var msg = _.find(_.gcm.sends, function(msg) {
          return msg.to === r2Token;
        });
        msgOK(msg, r2Token, sender.full_name, response, duration);
      });

      it('should update the old token in the database.', function() {
        return _.recorders.get(r2.recorder_client_id)
          .then(function(recorder) {
            expect(recorder.gcm_registration_token).not.to.equal(r2Token);
            expect(recorder).to.have.property('gcm_registration_token', gcmResponse.results[0].registration_id);
          });
      });
    });

    describe('1 has expired gcm_registration_token, 1 has no token', function() {
      var r1Token = _.token(64);
      var response;
      var gcmResponse;

      before(function() {
        gcmResponse = _.gcm.old(r1Token);

        while (_.gcm.sends.pop()) {}

        return Promise.all([
            _.recorders.updateGCMToken(r1.recorder_client_id, r1Token),
            _.recorders.update(r2.recorder_client_id, 'REMOVE gcm_registration_token'),
          ]);
      });

      it('should succeed with a message resource.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function(result) {
            responseOK(result, body.data.attributes, duration);
            response = result;
            done();
          },
          fail: done,
        });
      });

      it('should send 1 message to the old token via GCM.', function() {
        expect(_.gcm.sends).to.have.length(1);
        var msg = _.gcm.sends.pop();
        msgOK(msg, r1Token, sender.full_name, response, duration);
      });

      it('should update the old token in the database.', function() {
        return _.recorders.get(r1.recorder_client_id)
          .then(function(recorder) {
            expect(recorder.gcm_registration_token).not.to.equal(r1Token);
            expect(recorder).to.have.property('gcm_registration_token', gcmResponse.results[0].registration_id);
          });
      });
    });

    describe('both have expired gcm_registration_tokens', function() {
      var r1Token = _.token(64);
      var r2Token = _.token(64);
      var gcmResponse1, gcmResponse2;
      var response;

      before(function() {
        gcmResponse1 = _.gcm.old(r1Token);
        gcmResponse2 = _.gcm.old(r2Token);

        while (_.gcm.sends.pop()) {}

        return Promise.all([
            _.recorders.updateGCMToken(r1.recorder_client_id, r1Token),
            _.recorders.updateGCMToken(r2.recorder_client_id, r2Token),
          ]);
      });

      it('should succeed with a message resource.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function(result) {
            responseOK(result, body.data.attributes, duration);
            response = result;
            done();
          },
          fail: done,
        });
      });

      it('should send 2 messages via GCM.', function() {
        expect(_.gcm.sends).to.have.length(2);
        var msg = _.find(_.gcm.sends, function(msg) {
          return msg.to === r1Token;
        });
        msgOK(msg, r1Token, sender.full_name, response, duration);
        msg = _.find(_.gcm.sends, function(msg) {
          return msg.to === r2Token;
        });
        msgOK(msg, r2Token, sender.full_name, response, duration);
      });

      it('should update the old tokens in the database.', function() {
        return Promise.all([
            _.recorders.get(r1.recorder_client_id),
            _.recorders.get(r2.recorder_client_id),
          ])
          .then(function(recorders) {
            expect(recorders[0].gcm_registration_token).not.to.equal(r1Token);
            expect(recorders[0]).to.have.property('gcm_registration_token', gcmResponse1.results[0].registration_id);
            expect(recorders[1].gcm_registration_token).not.to.equal(r2Token);
            expect(recorders[1]).to.have.property('gcm_registration_token', gcmResponse2.results[0].registration_id);
          });
      });
    });
  });

  describe('Recipient is unknown', function() {
    it('should fail with a 404 error.', function(done) {
      var b = _.cloneDeep(body);
      b.data.attributes.recipient_email = 'x' + recipient.email;

      handler({
        Authorization: 'Bearer ' + sender.at,
        api_key: _.fake.API_KEY,
        'Content-Type': 'application/vnd.api+json',
        body: b,
      }, {
        fail: function(err) {
          expect(err).to.have.property('message', '404');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Recipient cannot receive messages via Peppermint');
          done();
        },
        succeed: function() {
          done(new Error('success without Peppermint user'));
        },
      });
    });
  });

  describe('Api Key errors', function() {
    describe('without an api_key field', function() {
      it('should fail with a "Bad Request" message', function(done) {
        handler({
          Authorization: 'Bearer ' + sender.at,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function() {
            throw new Error('success without API Key');
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.have.property('detail', 'invalid API Key');
            done();
          },
        });
      });
    });

    describe('with an unknown api_key', function() {
      it('should fail with a "Bad Request" message', function(done) {
        handler({
          Authorization: 'Bearer ' + sender.at,
          api_key: 'xyz123',
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function() {
            throw new Error('success with invalid API Key');
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.have.property('detail', 'invalid API Key');
            done();
          },
        });
      });
    });
  });

  describe('Unauthorized requests', function() {
    describe('Auth token does not match sender_email', function() {
      it('should fail with a 403 error.', function(done) {
        handler({
          Authorization: 'Bearer ' + recipient.at,
          api_key: _.fake.API_KEY,
          'Content-Type': 'application/vnd.api+json',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success with other JWT'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '403');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Auth token is not valid for sender');
            done();
          },
        });
      });
    });

    describe('without any "Authorization" field', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          body: body,
          'Content-Type': 'application/vnd.api+json',
        }, {
          succeed: function() {
            done(new Error('success without "Authorization" field'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '401');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header should be formatted: Bearer <JWT>');
            done();
          },
        });
      });
    });

    describe('with a mal-formed "Authorization" field', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          body: {},
          api_key: _.fake.API_KEY,
          Authorization: 'xxx',
          'Content-Type': 'application/vnd.api+json',
        }, {
          succeed: function() {
            done(new Error('success with mal-formed "Authorization" field'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '401');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header should be formatted: Bearer <JWT>');
            done();
          },
        });
      });
    });

    describe('with a mal-formed JWT in the "Authorization" field', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          'Content-Type': 'application/vnd.api+json',
          body: body,
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer xxx',
        }, {
          succeed: function() {
            done(new Error('success with mal-formed JWT'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '401');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Error: Not enough or too many segments');
            done();
          },
        });
      });
    });

    describe('with an expired JWT', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          body: body,
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + _.jwt.encode('a@exmaple.com', -1),
        }, {
          succeed: function() {
            done(new Error('success with expired JWT'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '401');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Error: Expired');
            done();
          },
        });
      });
    });
  });

  describe('Missing fields in body', function() {
    describe('audio_url', function() {
      it('should fail with a 400 error.', function(done) {
        var b = _.cloneDeep(body);
        delete b.data.attributes.audio_url;

        handler({
          body: b,
          'Content-Type': 'application/vnd.api+json',
          Authorization: 'Bearer ' + sender.at,
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error('success without audio_url'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Missing required property: audio_url');
            done();
          },
        });
      });
    });

    describe('sender_email', function() {
      it('should fail with a 400 error.', function(done) {
        var b = _.cloneDeep(body);
        delete b.data.attributes.sender_email;

        handler({
          body: b,
          'Content-Type': 'application/vnd.api+json',
          Authorization: 'Bearer ' + sender.at,
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error('success without sender_email'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Missing required property: sender_email');
            done();
          },
        });
      });
    });

    describe('recipient_email', function() {
      it('should fail with a 400 error.', function(done) {
        var b = _.cloneDeep(body);
        delete b.data.attributes.recipient_email;

        handler({
          body: b,
          'Content-Type': 'application/vnd.api+json',
          Authorization: 'Bearer ' + sender.at,
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error('success without recipient_email'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '400');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Missing required property: recipient_email');
            done();
          },
        });
      });
    });
  });

  describe('wrong Content-Type', function() {
    it('should fail with a 415 error.', function(done) {
      handler({
        body: body,
        Authorization: 'Bearer ' + sender.at,
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error('success with wrong content type'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '415');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Use "application/vnd.api+json"');
          done();
        },
      });
    });
  });
});

function responseOK(response, attrs, duration) {
  expect(response.id).to.be.ok;
  expect(response.type).to.equal('messages');
  expect(response.attributes).to.have.property('created');
  expect(response.attributes).to.have.property('audio_url', attrs.audio_url);
  expect(response.attributes).to.have.property('sender_email', attrs.sender_email.toLowerCase());
  expect(response.attributes).to.have.property('recipient_email', attrs.recipient_email.toLowerCase());
  expect(response.attributes).to.have.property('duration', duration);
  if (!tv4.validate(response, spec.responses['202'].schema)) {
    throw tv4.error;
  }
}

function msgOK(msg, to, from, response, duration) {
  expect(msg).to.be.ok;
  expect(msg).to.have.property('to', to);
  expect(msg).to.have.property('priority', 'high');
  expect(msg.data).to.deep.equal({
    message_id: response.id,
    audio_url: response.attributes.audio_url,
    sender_name: from,
    sender_email: response.attributes.sender_email,
    recipient_email: response.attributes.recipient_email,
    created: response.attributes.created,
    duration: duration,
    transcription: undefined,
  });
}

function msgOKiOSNotification(msg, from) {
  expect(msg).to.have.property('priority', 'high');
  expect(msg).to.have.property('notification');
}
