var expect = require('chai').expect;
var handler = require('./').handler;

describe('lambda:CreateRecorder', function() {
  describe('Invalid Input Data', function() {
    [{
      given: 'no api_key',
      req: {
        recorder: {
          recorder_client_id: 'abc123',
        },
      },
      errMatches: [/^Bad Request/, /Missing required property/, /api_key/],
    }, {
      given: 'no recorder',
      req: {
        api_key: 'abc123',
      },
      errMatches: [/^Bad Request/, /Missing required property/, /recorder/],
    }, {
      given: 'no recorder_client_id',
      req: {
        api_key: 'abc123',
        recorder: {},
      },
      errMatches: [/^Bad Request/, /Missing required property/, /recorder_client_id/],
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
