var tv4 = require('tv4');
var expect = require('chai').expect;
var jsonapischema = require('./jsonapischema');
var spec = require('../resources/transcriptions/_transcription_id_/delete/spec');
var _ = require('utils/test');

describe('DELETE /transcriptions/:id', function() {
  var recorder, tx;

  //fake recorder
  before(function() {
    return _.http('POST', '/recorder', {
      api_key: _.fake.API_KEY,
      recorder: {},
    })
    .then(function(res) {
      expect(res.statusCode).to.equal(201);
      recorder = res.body.recorder;
      recorder.at = res.body.at;
    });
  });

  //fake transcription
  before(function() {
    return _.http('POST', '/transcriptions', {
      audio_url: 'http://go.peppermint.com/' + recorder.recorder_id + '/abc.m4a',
      language: 'en-US',
      confidence: 0.5,
      text: 'hello',
    }, {
      'X-Api-Key': _.fake.API_KEY,
      Authorization: 'Bearer ' + recorder.at,
    })
    .then(function(res) {
      expect(res.statusCode).to.equal(201);
      tx = res.body;
    });
  });

  describe('with a valid X-Api-Key header', function() {
    describe('transcription does not exist', function() {
      it('should return a 204 response.', function() {
        return _.http('DELETE', tx.transcription_url + 'x', null, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + recorder.at,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(204);
        });
      });
    });

    describe('transcription exists', function() {
      describe('unauthenticated', function() {
        it('should return a 401 response.', function() {
          return _.http('DELETE', tx.transcription_url + 'x', null, {
            'X-Api-Key': _.fake.API_KEY,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            expect(res.body).to.deep.equal({
              errors: [{detail: 'Authorization header should be formatted: Bearer <JWT>'}],
            });
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['401'].schema)) {
              throw tv4.error;
            }
          });
        });
      });

      describe('authenticated as another recorder', function() {
        var recorder;

        before(function() {
          return _.http('POST', '/recorder', {
            api_key: _.fake.API_KEY,
            recorder: {},
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(201);
            recorder = res.body.recorder;
            recorder.at = res.body.at;
          });
        });

        it('should return a 403 error.', function() {
          return _.http('DELETE', tx.transcription_url, null, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + recorder.at,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(403);
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            expect(res.body).to.deep.equal({
              errors: [{detail: 'Authorization header does not authenticate owner of transcription'}],
            });
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['403'].schema)) {
              throw tv4.error;
            }
          });
        });
      });

      describe('authenticated by account only', function() {
        var account;

        before(function() {
          var user = _.fake.user();
          return _.http('POST', '/accounts', {
            api_key: _.fake.API_KEY,
            u: user,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(201);
            account = res.body.u;
            account.at = res.body.at;
          });
        });

        it('should return a 401 error.', function() {
          return _.http('DELETE', tx.transcription_url, null, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + account.at,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            expect(res.body).to.deep.equal({
              errors: [{detail: 'Authorization header must authenticate recorder'}],
            });
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['401'].schema)) {
              throw tv4.error;
            }
          });

        });
      });

      describe('authenticated as recorder that produced audio', function() {
        before(function() {
          return _.http('GET', tx.transcription_url, null, {
            'X-Api-Key': _.fake.API_KEY,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
          });
        });

        it('should return a 204 response.', function() {
          return _.http('DELETE', tx.transcription_url, null, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + recorder.at,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(204);
          });
        });
 
        it('subsequent GETs should 404.', function() {
          return _.http('GET', tx.transcription_url, null, {
            'X-Api-Key': _.fake.API_KEY,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(404);
          });
        });
      });
    });
  });

  describe('without X-Api-Key header', function() {
    it('should fail with a 401 error.', function() {
      return _.http('DELETE', tx.transcription_url + 'x', null, {
        Authorization: 'Bearer ' + recorder.at,
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(401);
      });
    });
  });
});
