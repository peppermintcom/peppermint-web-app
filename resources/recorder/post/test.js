var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

const DESCRIPTION = 'Mocha';

describe('lambda:CreateRecorder', function() {
  describe('Valid', function() {
    it('should invoke succeed with a Recorder', function(done) {
      var clientID = _.token(12);

      handler({
        api_key: _.fake.API_KEY,
        recorder: {
          recorder_client_id: clientID,
          description: 'Mocha',
        },
      }, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function(r) {
          expect(r).to.have.property('at');
          expect(r.at).to.match(/^[\w\-]+\.[\w\-]+\.[\w\-]+$/);
          expect(r).to.have.property('recorder');
          expect(r.recorder).to.have.property('recorder_id');
          expect(r.recorder).to.have.property('recorder_client_id', clientID);
          expect(r.recorder).to.have.property('recorder_key');
          expect(r.recorder).to.have.property('recorder_ts');
          expect(r.recorder).to.have.property('description', 'Mocha');
          done();
        }
      });
    });
  });

  describe('Duplicate recorder_client_id', function() {
    var clientID = _.token(12);

    before(function(done) {
      handler({
        api_key: _.fake.API_KEY,
        recorder: {
          recorder_client_id: clientID,
        },
      }, {
        succeed: function() {
          done();
        },
      });
    });

    it('should invoke context.fail with a Conflict error', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        recorder: {
          recorder_client_id: clientID,
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/^Conflict/);
          expect(err).to.match(/recorder_client_id/);
          done();
        },
      });
    });
  });

  describe('unknown api_key', function() {
    it('should invoke context.fail with an Unauthorized error', function(done) {
      handler({
        api_key: 'xyz',
        recorder: {
          recorder_client_id: _.token(12),
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/^Unauthorized/);
          expect(err).to.match(/api_key/);
          done();
        },
      });
    });
  });

  describe('Invalid Input Data', function() {
    [{
      given: 'no api_key',
      req: {
        recorder: {
          recorder_client_id: 'abcd1234',
        },
      },
      errMatches: [/^Bad Request/, /Missing required property/, /api_key/],
    }, {
      given: 'no recorder',
      req: {
        api_key: _.fake.API_KEY,
      },
      errMatches: [/^Bad Request/, /Missing required property/, /recorder/],
    }].forEach(function(t) {
      describe(t.given, function() {
        it('should invoke context.fail with a Bad Request error.', function(done) {
          handler(t.req, {
            succeed: function() {
              done(new Error('succeed'));
            },
            fail: function(err) {
              expect(err).to.be.ok;
              t.errMatches.forEach(function(rx) {
                expect(err).to.match(rx);
              });
              done();
            },
          });
        });
      });
    });
  });
});
