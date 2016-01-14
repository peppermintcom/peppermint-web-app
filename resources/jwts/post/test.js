var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:Authenticate', function() {
  describe('valid requests', function() {
    it('should succeed.', function(done) {
      handler({
        Authorization: 'Peppermint recorder=xyz',
        api_key: _.fake.API_KEY,
      }, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function() {
          done();
        },
      });
    });
  });

  describe('unparseable Authorization headers', function() {
    it('should fail.', function(done) {
      handler({
        Authorization: 'Peppermint recorder=',
        api_key: _.fake.API_KEY,
      }, {
        succeed: function() {
          done(new Error('success with bad Auth header'));
        },
        fail: function(err) {
          expect(err).to.match(/^Bad Request/);
          done();
        },
      });
    });
  });
});
