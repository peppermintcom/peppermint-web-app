var expect = require('chai').expect;
var request = require('request');

describe('peppermint.com short url service.', function() {
  /* 
   * CreateRecord contains an integration test for a valid short_url generated
   * by the API so here we only tests invalid requests.
   */
  describe('unknown short_url', function() {
    it ('should redirect to the 404 error page.', function(done) {
      request({
        url: 'https://peppermint.com/fake456',
        followRedirect: false,
      }, function(err, res, body) {
        if (err) {
          done(err);
          return;
        }
        expect(res.statusCode).to.equal(302);
        expect(res.headers.location).to.equal('/404');
        done();
      });
    });
  });
});
