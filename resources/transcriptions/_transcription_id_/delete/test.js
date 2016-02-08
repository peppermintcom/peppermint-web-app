var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:DeleteTranscription', function() {
  var recorder, tx;

  before(function() {
    return _.fake.recorder2().then(function(_recorder) {
      recorder = _recorder;
    });
  });

  before(function() {
    return _.fake.transcription(recorder.recorder_id).then(function(_tx) {
      tx = _tx;
    });
  });

  describe('Authenticated with account only', function() {
    var account;

    before(function() {
      return _.fake.account().then(function(_account) {
        account = _account;
      });
    });

    it('should fail with a 401 error.', function(done) {
      handler({
        Authorization: 'Bearer ' + account.at,
        api_key: _.fake.API_KEY,
        transcription_id: tx.id,
      }, {
        succeed: function() {
          done(new Error('success with account authentication'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header must authenticate recorder');
          done();
        },
      });
    });

    it('should not delete the transcription from the database.', function() {
      return _.transcriptions.get(tx.id)
        .then(function(transcription) {
          expect(transcription).to.be.ok;
        });
    });
  });

  describe('Unauthenticated', function() {
    it('should fail with a 401 error.', function(done) {
      handler({
        Authorization: 'Bearer ',
        api_key: _.fake.API_KEY,
        transcription_id: tx.id,
      }, {
        succeed: function() {
          done(new Error('success without authentication'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header should be formatted: Bearer <JWT>');
          done();
        },
      });
    });

    it('should not delete the transcription from the database.', function() {
      return _.transcriptions.get(tx.id)
        .then(function(transcription) {
          expect(transcription).to.be.ok;
        });
    });
  });

  describe('Authenticated with different recorder_id', function() {
    var recorder;

    before(function() {
      return _.fake.recorder2().then(function(_recorder) {
        recorder = _recorder;
      });
    });

    before(function() {
      return _.transcriptions.get(tx.id)
        .then(function(transcription) {
          expect(transcription).to.be.ok;
        });
    });

    it('should fail with a 403 error.', function(done) {
      handler({
        Authorization: 'Bearer ' + recorder.at,
        api_key: _.fake.API_KEY,
        transcription_id: tx.id,
      }, {
        succeed: function() {
          done(new Error('success with authorization'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '403');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header does not authenticate owner of transcription');;
          done();
        },
      });
    });

    it('should not delete the transcription from the database.', function() {
      return _.transcriptions.get(tx.id)
        .then(function(transcription) {
          expect(transcription).to.be.ok;
        });
    });
  });

  describe('Authenticated with recorder_id that uploaded audio', function() {
    before(function() {
      return _.transcriptions.get(tx.id)
        .then(function(transcription) {
          expect(transcription).to.be.ok;
        });
    });

    it('should succeed.', function(done) {
      handler({
        Authorization: 'Bearer ' + recorder.at,
        api_key: _.fake.API_KEY,
        transcription_id: tx.id,
      }, {
        succeed: function(result) {
          expect(result).to.be.undefined;
          done();
        },
        fail: done
      });
    });

    it('should delete the transcription from the database.', function() {
      return _.transcriptions.get(tx.id)
        .then(function(transcription) {
          expect(transcription).not.to.be.ok;
        });
    });
  });

  describe('Transcription does not exist', function() {
    before(function() {
      return _.transcriptions.del(tx.id);
    });

    it('should succeed.', function(done) {
      handler({
        Authorization: 'Bearer ' + recorder.at,
        api_key: _.fake.API_KEY,
        transcription_id: tx.id,
      }, {
        succeed: function(result) {
          expect(result).to.be.undefined;
          done();
        },
        fail: done,
      });
    });
  });
});
