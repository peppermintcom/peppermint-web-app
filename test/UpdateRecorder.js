var expect = require('chai').expect;
var tv4 = require('tv4');
var jsonapischema = require('./jsonapischema.json');
var spec = require('../resources/recorders/_recorder_id_/put/spec');
var _ = require('utils/test');

describe('PUT /recorders/:recorderID', function() {
  var gcmToken = 'gcm123';
  var recorderID, clientID, jwt, body;
  var put;

  before(function() {
    return _.http('POST', '/recorder', {
        api_key: _.fake.API_KEY,
        recorder: {},
      })
      .then(function(result) {
        recorderID = result.body.recorder.recorder_id;
        clientID = result.body.recorder.recorder_client_id;
        jwt = result.body.at;
        put = _.partial(_.http, 'PUT', '/recorders/' + recorderID);
        body = {
          data: {
            type: 'recorders',
            id: recorderID,
            attributes: {
              gcm_registration_token: gcmToken,
            },
          },
        };
      });
  });

  describe('valid requests', function() {
    describe('to change gcm_registration_token', function() {
      describe('given the recorder is not linked to an account', function() {
        it('should succeed.', function() {
          return put(body, {
              'X-Api-Key': _.fake.API_KEY,
              Authorization: 'Bearer ' + jwt,
              'Content-Type': 'application/vnd.api+json',
            })
            .then(function(res) {
              expect(res.statusCode).to.equal(200);
              expect(res.body).to.equal(null);
              expect(res.headers).to.have.property('content-type', 'application/json');
            });
        });

        it('should update the recorder record in the database.', function() {
          return _.dynamo.get('recorders', {
              client_id: {S: clientID},
            })
            .then(function(record) {
              expect(record.gcm_registration_token).to.deep.equal({S: gcmToken});
            });
        });
      });
    });
  });

  describe('without X-Api-Key header', function() {
    it('should respond with a 400 error.', function() {
      return put(body, {
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/vnd.api+json',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.deep.equal({
            errors: [{
              detail: 'invalid API Key',
            }],
          });
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['400'].schema)) {
            throw tv4.error;
          }
        });
    });
  });

  describe('with unformatted body', function() {
    it('should respond with a 400 error.', function() {
      return put({}, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/vnd.api+json',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.deep.equal({
            errors: [{
              detail: 'Missing required property: data',
            }],
          });
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['400'].schema)) {
            throw tv4.error;
          }
        });
    });
  });

  describe('without Authorization', function() {
    it('should respond with a 401 error.', function() {
      return put(body, {
          'X-Api-Key': _.fake.API_KEY,
          'Content-Type': 'application/vnd.api+json',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.deep.equal({
            errors: [{
              detail: 'Authorization header should be formatted: Bearer <JWT>'
            }],
          });
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['401'].schema)) {
            throw tv4.error;
          }
        });
    });
  });

  describe('with Authentication for different recorder than path param', function() {
    it('should responsd with a 403 error.', function() {
      return _.http('PUT', '/recorders/x', body, {
        Authorization: 'Bearer ' + jwt,
        'Content-Type': 'application/vnd.api+json',
        'X-Api-Key': _.fake.API_KEY,
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(403);
        expect(res.body).to.deep.equal({
          errors: [{
            detail: 'Auth token is not valid for recorder x',
          }],
        });
        expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(res.body, jsonapischema)) {
          throw tv4.error;
        }
        if (!tv4.validate(res.body, spec.responses['403'].schema)) {
          throw tv4.error;
        }
      });
    });
  });

  describe('with Content-Type "application/json"', function() {
    it('should respond with a 415 error.', function() {
      return put(body, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/json',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(415);
          expect(res.body).to.deep.equal({
            errors: [{
              detail: 'Use "application/vnd.api+json"',
            }],
          });
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['415'].schema)) {
            throw tv4.error;
          }
        });
    });
  });

  describe('with Content-Type "text/plain"', function() {
    it('should respond with a 415 error.', function() {
      return put(body, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'text/plain',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(415);
          expect(res.body).to.deep.equal({
            errors: [{
              detail: 'Use "application/vnd.api+json"',
            }],
          });
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['415'].schema)) {
            throw tv4.error;
          }
        });
    });
  });
});
