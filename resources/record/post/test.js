var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils');

/**
 * WARNING: DEPENDENCIES
 * The hashid function's salt causes 70 to return 'AW3'.
 * The peppermint-cdn bucket has a file at /AW3/cpLPai2DIqcETFtWsn0cWc
 */
describe('lambda:CreateRecord', function() {
  var jwt = _.jwt(null, 'AW3');
  var signedURL = 'https://peppermint-cdn.s3.amazonaws.com/AW3/cpLPai2DIqcETFtWsn0cWc?AWSAccessKeyId=AKIAJZTQ4SASPHAFE5AQ&Expires=1445220215&Signature=47q4xCdhIc89K0SMm2YHH%2BQIAdI%3D';

  describe('Valid Requests', function() {
    describe('given a valid signed_url', function() {
      it('should return a publicly readable url', function(done) {
        handler({
          Authorization: 'Bearer ' + jwt,
          body: {
            signed_url: signedURL,
          },
        }, {
          fail: function(err) {
            done(new Error(err));
          },
          succeed: function(res) {
            expect(res).to.have.property('canonical_url', 'https://duw3fm6pm35xc.cloudfront.net/AW3/cpLPai2DIqcETFtWsn0cWc');
            expect(res).to.have.property('short_url');
            done();
          }
        });
      });
    });
  });

  describe('Invalid', function() {
    describe('Missing Authorization field', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          body: {
            signed_url: signedURL,
          },
        }, {
          fail: function(err) {
            expect(err).to.match(/Unauthorized/);
            done();
          },
          succeed: function() {
            done(new Error('succeed'));
          },
        });
      });
    });

    describe('Empty Authorization field', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          Authorization: '',
          body: {
            signed_url: signedURL
          },
        }, {
          fail: function(err) {
            expect(err).to.match(/Unauthorized/);
            done();
          },
          succeed: function() {
            done(new Error('succeed'));
          },
        });
      });
    });

    describe('Malformed Authorization field', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          Authorization: jwt,
          body: {
            signedURL: 'audio/mp3',
          },
        }, {
          fail: function(err) {
            expect(err).to.match(/Unauthorized/);
            done();
          },
          succeed: function() {
            done(new Error('succeed'));
          },
        });
      });
    });

    describe('Missing signed_url in body', function() {
      it('should fail with a 400 error.', function(done) {
        handler({
          Authorization: 'Bearer ' + jwt,
          body: {},
        }, {
          fail: function(err) {
            expect(err).to.match(/Bad Request.*signed_url/)
            done();
          },
          succeed: function() {
            done(new Error('succeed'));
          },
        })
      });
    });
  });
});
