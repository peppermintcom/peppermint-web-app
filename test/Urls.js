var expect = require('chai').expect;
var request = require('request');

describe('peppermint.com short url service.', function() {
  /* 
   * CreateRecord contains an integration test for a valid short_url generated
   * by the API so here we only tests invalid requests.
   */
  describe('unknown short_url', function() {
    it ('should return a 404 error.', function(done) {
      request('https://peppermint.com/fake456', function(err, res, body) {
        if (err) {
          done(err);
          return;
        }
        expect(res.statusCode).to.equal(404);
        done();
      });
    });
  });
});
