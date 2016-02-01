var expect = require('chai').expect;
var tv4 = require('tv4');
var jsonapischema = require('./jsonapischema');
var spec = require('../resources/messages/post/spec');
var _ = require('utils/test');

describe('POST /messages', function() {
  var post = _.partial(_.http, 'POST', '/messages');
  var sender, recipient, jwt, recorder, recorderJWT;

  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.account(),
      _.fake.recorder(),
    ])
    .then(function(results) {
      sender = results[0];
      recipient = results[1];
      recorder = results[2].recorder;

      return _.http('POST', '/jwts', null, {
        Authorization: _.peppermintScheme(null, null, sender.email, sender.password),
        'X-Api-Key': _.fake.API_KEY,
      });
    })
    .then(function(response) {
      expect(response.statusCode).to.equal(200);
      jwt = response.body.data.attributes.token;

      return _.http('POST', '/jwts', null, {
        Authorization: _.peppermintScheme(recorder.recorder_client_id, recorder.recorder_key),
        'X-Api-Key': _.fake.API_KEY,
      })
    })
    .then(function(response) {
      expect(response.statusCode).to.equal(200);
      recorderJWT = response.body.data.attributes.token;
    });
  });

  describe('Unformatted body', function() {
    describe('response', function() {
      var response;

      before(function() {
        return post({
            data: {
              attributes: {
                sender_email: sender.email,
                recipient_email: recipient.email,
                audio_url: _.fake.AUDIO_URL,
              },
            },
          }, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + jwt,
            'Content-Type': 'application/vnd.api+json',
          })
          .then(function(res) {
            response = res;
          });
      });

      it('should have status code 400.', function() {
        expect(response.statusCode).to.equal(400);
      });

      it('should send valid JSON-API content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, spec.responses['400'].schema)) {
          throw tv4.error;
        }
      });

      it('should format body according to spec.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'Missing required property: type'}]
        });
        if (!tv4.validate(response.body, spec.responses['400'].schema)) {
          throw tv4.error;
        }
      });
    });
  });

  describe('Missing X-Api-Key header', function() {
    describe('response', function() {
      var response;

      before(function() {
        return post({
          data: {
            type: 'messages',
            attributes: {
              sender_email: sender.email,
              recipient_email: recipient.email,
              audio_url: _.fake.AUDIO_URL,
            },
          },
        }, {
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/vnd.api+json',
        })
        .then(function(res) {
          response = res;
        });
      });

      it('should have a 400 status code.', function() {
        expect(response.statusCode).to.equal(400);
      });

      it('should send valid JSON-API content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, spec.responses['400'].schema)) {
          throw tv4.error;
        }
      });

      it('should format body according to spec.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'invalid API Key'}]
        });
        if (!tv4.validate(response.body, spec.responses['400'].schema)) {
          throw tv4.error;
        }
      });
    });
  });

  describe('No Authorization header', function() {
    describe('response', function() {
      var response;

      before(function() {
        return post({
          data: {
            type: 'messages',
            attributes: {
              sender_email: sender.email,
              recipient_email: recipient.email,
              audio_url: _.fake.AUDIO_URL,
            },
          },
        }, {
          'Content-Type': 'application/vnd.api+json',
          'X-Api-Key': _.fake.API_KEY,
        })
        .then(function(res) {
          response = res;
        });
      });

      it('should have a 401 status code.', function() {
        expect(response.statusCode).to.equal(401);
      });

      it('should send valid JSON-API content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, spec.responses['401'].schema)) {
          throw tv4.error;
        }
      });

      it('should format body according to spec.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'Authorization header should be formatted: Bearer <JWT>'}]
        });
        if (!tv4.validate(response.body, spec.responses['401'].schema)) {
          throw tv4.error;
        }
      });
    });
  });

  describe('Authorization header does not authenticate account', function() {
    describe('response', function() {
      var response;

      before(function() {
        return post({
          data: {
            type: 'messages',
            attributes: {
              sender_email: sender.email,
              recipient_email: recipient.email,
              audio_url: _.fake.AUDIO_URL,
            },
          },
        }, {
          Authorization: 'Bearer ' + recorderJWT,
          'Content-Type': 'application/vnd.api+json',
          'X-Api-Key': _.fake.API_KEY,
        })
        .then(function(res) {
          response = res;
        });
      });

      it('should have a 401 status code.', function() {
        expect(response.statusCode).to.equal(401);
      });

      it('should send valid JSON-API content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, spec.responses['401'].schema)) {
          throw tv4.error;
        }
      });

      it('should format body according to spec.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'Auth token does not authenticate an account'}]
        });
        if (!tv4.validate(response.body, spec.responses['401'].schema)) {
          throw tv4.error;
        }
      });
    });
  });

  describe('Authorization header authenticated different account then sender_email', function() {
    describe('response', function() {
      var response;

      before(function() {
        return post({
          data: {
            type: 'messages',
            attributes: {
              //swapped so we can test with existing jwt
              sender_email: recipient.email,
              recipient_email: sender.email,
              audio_url: _.fake.AUDIO_URL,
            },
          },
        }, {
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/vnd.api+json',
          'X-Api-Key': _.fake.API_KEY,
        })
        .then(function(res) {
          response = res;
        });
      });

      it('should have a 403 status code.', function() {
        expect(response.statusCode).to.equal(403);
      });

      it('should send valid JSON-API content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, spec.responses['403'].schema)) {
          throw tv4.error;
        }
      });

      it('should format body according to spec.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'Auth token is not valid for sender'}]
        });
        if (!tv4.validate(response.body, spec.responses['403'].schema)) {
          throw tv4.error;
        }
      });
    });
  });

  describe('Recipient does not have an account device group.', function() {
    describe('response', function() {
      var response;

      before(function() {
        return post({
            data: {
              type: 'messages',
              attributes: {
                sender_email: sender.email,
                recipient_email: recipient.email,
                audio_url: _.fake.AUDIO_URL,
              },
            },
          }, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + jwt,
            'Content-Type': 'application/vnd.api+json',
          })
          .then(function(res) {
            response = res;
          });
      });

      it('should have status code 404.', function() {
        expect(response.statusCode).to.equal(404);
      });

      it('should send valid JSON-API content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, spec.responses['404'].schema)) {
          throw tv4.error;
        }
      });

      it('should format body according to spec.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'Recipient cannot receive messages via Peppermint'}],
        });
        if (!tv4.validate(response.body, spec.responses['404'].schema)) {
          throw tv4.error;
        }
      });
    });

  });

  describe('Wrong Content-Type', function() {
    describe('response', function() {
      var response;

      before(function() {
        return post({
            data: {
              type: 'messages',
              attributes: {
                sender_email: sender.email,
                recipient_email: recipient.email,
                audio_url: _.fake.AUDIO_URL,
              },
            },
          }, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + jwt,
          })
          .then(function(res) {
            response = res;
          });
      });

      it('should have status code 415.', function() {
        expect(response.statusCode).to.equal(415);
      });

      it('should send valid JSON-API content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, spec.responses['415'].schema)) {
          throw tv4.error;
        }
      });

      it('should format body according to spec.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'Use "application/vnd.api+json"'}]
        });
        if (!tv4.validate(response.body, spec.responses['415'].schema)) {
          throw tv4.error;
        }
      });
    });
  });
});
