var expect = require('chai').expect;
var _ = require('utils/test');
var post = _.partial(_.http, 'POST', '/transcriptions');

const BASE = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/transcriptions/';
const LANG = 'en-US';
const TEXT = 'what was said';
const CONFIDENCE = 0.99;

describe('POST /transcriptions', function() {
  var Auth;
  var recorder;
  var upload;
  var headers;
  var body;

  //register a recorder
  before(function() {
    return _.http('POST', '/recorder', {
        api_key: _.fake.API_KEY,
        recorder: {},
      })
      .then(function(r) {
        Auth = 'Bearer ' + r.body.at;
        recorder = r.body.recorder;
        headers = {
          Authorization: Auth,
          'X-Api-Key': _.fake.API_KEY,
        };
      });
  });

  //provision an upload
  before(function() {
    return _.http('POST', '/uploads', {
        content_type: 'audio/mp4',
      }, {
        Authorization: Auth,
      })
      .then(function(r) {
        upload = r.body;
        body = {
          language: LANG,
          text: TEXT,
          audio_url: upload.canonical_url,
          confidence: CONFIDENCE,
        };
      });
  });

  describe('valid requests', function() {
    it('should return a 201 response.', function() {
      return post(body, headers)
        .then(function(res) {
          expect(res.statusCode).to.equal(201);
          expect(res.body).to.have.property('transcription_url');
          expect(res.body).to.have.property('ip_address');
          expect(res.body).to.have.property('timestamp');
          expect(res.body).to.have.property('audio_url', upload.canonical_url);
          expect(res.body).to.have.property('recorder_id', recorder.recorder_id);
          expect(res.body).to.have.property('language', LANG);
          expect(res.body).to.have.property('text', TEXT);
          expect(res.body).to.have.property('confidence', CONFIDENCE);
        });
    });
  });

  describe('400', function() {
    describe('without audio_url', function() {
      it('should return a 400 Bad Request error.', function() {
        return post(_.omit(body, 'audio_url'), headers)
          .then(function(res) {
            expect(res.statusCode).to.equal(400);
            expect(res.body.errorMessage).to.match(/audio_url/);
          });
      });
    });

    describe('with non-canonical audio_url', function() {
      it('should respond with a 400 Bad Request error.', function() {
        return post(_.assign({}, body, {audio_url: 'https://peppermint.com/abcdef'}), headers)
          .then(function(res) {
            expect(res.statusCode).to.equal(400);
            expect(res.body.errorMessage).to.match(/audio_url/);
          });
      });
    });
  });

  describe('401', function() {
    describe('without Authorization header', function() {
      it('should return a 401 Unauthorized response.', function() {
        return post(body, _.omit(headers, 'Authorization'))
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
          });
      });
    });

    describe('without X-Api-Key header', function() {
      it('should return a 401 Unauthorized response.', function() {
        return post(body, _.omit(headers, 'X-Api-Key'))
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
          });
      });
    });
  });

  describe('403', function() {
    describe('with auth token for recorder that did not produce audio', function() {
      var jwt;

      before(function() {
        return _.http('POST', '/recorder', {
            api_key: _.fake.API_KEY,
            recorder: {},
          })
          .then(function(r) {
            jwt = r.body.at;
          });
      });

      it('should return a 403 Forbidden response.', function() {
        return post(body, _.assign({}, headers, {Authorization: 'Bearer ' + jwt}))
          .then(function(res) {
            expect(res.statusCode).to.equal(403);
          });
      });
    });
  });
});
