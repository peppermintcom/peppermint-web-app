var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe.only('lambda:Authenticate', function() {
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
});
