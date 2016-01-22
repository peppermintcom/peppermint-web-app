var expect = require('chai').expect;
var _ = require('utils/test');

var BASE = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/transcriptions/';
var AUDIO_ORIGIN = 'http://go.peppermint.com';

describe('GET /transcriptions/{transcription_id}', function() {
  var transcription = null;
  var get = null;

  before(function() {
    return _.fake.transcription().then(function(tx) {
      transcription = tx;
      get = _.partial(_.http, 'GET', '/transcriptions/' + transcription.id, null);
    });
  });

  describe('with valid X-Api-Key header and transcription_id path param', function() {
    it('should return a representation of the transcription.', function() {
      return get({
          'X-Api-Key': _.fake.API_KEY,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.deep.equal({
            transcription_url: BASE + transcription.id,
            audio_url: transcription.audio_url,
            ip: transcription.ip,
            timestamp: _.timestamp(transcription.ts),
            text: transcription.text,
            language: transcription.language,
            confidence: transcription.confidence,
          });
        });
    });
  });

  describe('without X-Api-Key header', function() {
    it('should return a 401 response.', function() {
      return get().then(function(res) {
        expect(res.statusCode).to.equal(401);
        expect(res.body.errorMessage).to.match(/api_key/);
      });
    });
  });

  describe('with invalid X-Api-Key header', function() {
    it('should return a 401 response.', function() {
      return get({
          'X-Api-Key': 'x' + _.fake.API_KEY,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/api_key/);
        });
    });
  });

  describe('with a non-existent transaction_id path param', function() {
    it('should return a 404 response.', function() {
      return _.http('GET', '/transcriptions/x' + transcription.id, null, {
          'X-Api-Key': _.fake.API_KEY,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(404);
          expect(res.body).to.have.property('errorMessage', 'Not Found');
        });
    });
  });
});
