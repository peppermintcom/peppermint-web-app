var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('.').handler;

var BASE = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/transcriptions/';

describe('lambda:GetTranscription', function() {
  var transcription = null;

  before(function() {
    return _.fake.transcription().then(function(tx) {
      transcription = tx;
    });
  });

  describe('with valid api_key and transcription_id', function() {
    it('should return a representation of the transcription', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        transcription_id: transcription.id,
      }, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function(res) {
          expect(res).to.have.property('transcription_url', BASE + transcription.id);
          expect(res).to.have.property('audio_url', transcription.audio_url);
          expect(res).to.have.property('confidence', transcription.confidence);
          expect(res).to.have.property('text', transcription.text);
          expect(res).to.have.property('ip', transcription.ip);
          expect(res).to.have.property('timestamp', _.timestamp(transcription.ts.valueOf()));
          expect(res).to.have.property('language', transcription.language);
          done();
        },
      });
    });
  });

  describe('without an api_key', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        transcription_id: transcription.id,
      }, {
        fail: function(err) {
          expect(err).to.match(/^Unauthorized.*api_key/);
          done();
        },
        succeed: function() {
          done(new Error('success without api_key'));
        },
      });
    });
  });

  describe('with an invalid api_key', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        transcription_id: transcription.id,
        api_key: 'x' + _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error('success with invalid api_key'));
        },
        fail: function(err) {
          expect(err).to.match(/^Unauthorized.*api_key/);
          done();
        },
      });
    });
  });

  describe('with non-existent transcription_id', function() {
    it('should fail with a Not Found error.', function(done) {
      handler({
        transcription_id: 'x' + transcription.id,
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error('success with invalid transcription_id'));
        },
        fail: function(err) {
          expect(err).to.match(/^Not Found/);
          done();
        },
      });
    });
  });
});
