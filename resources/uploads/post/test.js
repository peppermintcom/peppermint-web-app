var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe('lambda:CreateUpload', function() {
  var jwt, recorder;

  before(function() {
    return _.fake.recorder().then(function(res) {
      jwt = res.at;
      recorder = res.recorder;
    });
  });

  after(function() {
    _.deleteRecorder(recorder.recorder_client_id);
  });

  describe('Valid Requests with content-type "audio/mp4"', function() {
    it('should return a signed_url for the peppermint-cdn bucket.', function(done) {
      handler({
        Authorization: 'Bearer ' + jwt,
        body: {
          content_type: 'audio/mp4',
          recorder_id: recorder.recorder_id,
        },
      }, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function(upload) {
          expect(upload).to.have.property('signed_url');
          expect(upload).to.have.property('short_url');
          expect(upload).to.have.property('canonical_url');
          expect(upload.canonical_url).to.match(/\.m4a$/);
          done();
        },
      });
    });
  });

  describe('Missing Authorization field', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        body: {
          content_type: 'audio/mp3',
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized/);
          done();
        },
        succeed: function() {
          throw new Error('succeed');
        },
      });
    });
  });

  describe('Empty Authorization field', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        Authorization: '',
        body: {
          content_type: 'audio/mp3',
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized/);
          done();
        },
        succeed: function() {
          throw new Error('succeed');
        },
      });
    });
  });

  describe('Malformed Authorization field', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        Authorization: jwt,
        body: {
          content_type: 'audio/mp3',
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized/);
          done();
        },
        succeed: function() {
          throw new Error('succeed');
        },
      });
    });
  });

  describe('Tampered JWT', function() {
    it('should fail with an Unauthorized error.', function(done) {
      handler({
        Authorization: 'Bearer ' + jwt + 'x',
        body: {
          content_type: 'audio/mp3',
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized/);
          done();
        },
        succeed: function() {
          throw new Error('succeed');
        },
      });
    });
  });

  describe('Inavlid requests', function() {
    describe('Missing content_type field', function() {
      it('should fail with a Bad Request error.', function(done) {
        handler({
          Authorization: 'Bearer ' + jwt,
          body: {},
        }, {
          fail: function(err) {
            expect(err).to.match(/Bad Request.*content_type/);
            done();
          }
        });
      });
    });
  });
});
