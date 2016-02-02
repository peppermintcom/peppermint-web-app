var expect = require('chai').expect;
var tv4 = require('tv4');
var handler = require('./').handler;
var spec = require('./spec');
var _ = require('utils/test');

describe('lambda:CreateMessage', function() {
  //user is an account with receiver recorder and device group on account
  var sender, user, nonuser, body;

  before(function() {
    return Promise.all([
        _.fake.account(),
        _.fake.account(),
        _.fake.accountDeviceGroup(),
      ])
      .then(function(results) {
        sender = results[0];
        nonuser = results[1];
        user = results[2];

        body = {
          data: {
            type: 'messages',
            attributes: {
              sender_email: sender.email,
              recipient_email: user.account.email,
              audio_url: 'http://go.peppermint.com',
            },
          },
        };
      });
  });

  describe('Recipient with device group', function() {
    var response;

    before(function(done) {
      handler({
        Authorization: 'Bearer ' + sender.at,
        api_key: _.fake.API_KEY,
        'Content-Type': 'application/vnd.api+json',
        body: body,
      }, {
        succeed: function(_response) {
          response = _response;
          done();
        },
        fail: done,
      });
    });

    it('should succeed with a message object.', function() {
      expect(response.id).to.be.ok;
      expect(response.type).to.equal('messages');
      expect(response.attributes).to.have.property('created');
      expect(response.attributes).to.have.property('audio_url', body.data.attributes.audio_url);
      expect(response.attributes).to.have.property('sender_email', body.data.attributes.sender_email.toLowerCase());
      expect(response.attributes).to.have.property('recipient_email', body.data.attributes.recipient_email.toLowerCase());
      if (!tv4.validate(response, spec.responses['202'].schema)) {
        throw tv4.error;
      }
    });

    it('should send a message to GCM for the account\'s device group', function() {
      var m = _.gcm.sends.pop();

      expect(m).to.have.property('to', user.account.gcm_notification_key);
      expect(m).not.to.have.property('data');
      expect(m.notification).to.deep.equal({
        message_id: response.id,
        audio_url: body.data.attributes.audio_url,
        sender_name: 'John Doe',
        sender_email: response.attributes.sender_email,
        recipient_email: response.attributes.recipient_email,
        created: response.attributes.created,
        transcription: null
      });
    });
  });

  describe('Recipient does not have device group', function() {
    it('should fail with a 404 error.', function(done) {
      var b = _.cloneDeep(body);
      b.data.attributes.recipient_email = nonuser.email;

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

  describe('Recipient is unknown', function() {
    it('should fail with a 404 error.', function(done) {
      var b = _.cloneDeep(body);
      b.data.attributes.recipient_email = 'x' + nonuser.email;

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
          Authorization: 'Bearer ' + nonuser.at,
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
