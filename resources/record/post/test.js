var expect = require('chai').expect;
var handler = require('./').handler;

describe('lambda:CreateRecord', function() {
  describe('given a valid signed_url', function() {
    it('should return a publicly readable url', function(done) {
      handler({
        body: {
          signed_url: 'https://peppermint-cdn.s3.amazonaws.com/AW3/cpLPai2DIqcETFtWsn0cWc?AWSAccessKeyId=AKIAJZTQ4SASPHAFE5AQ&Expires=1445220215&Signature=47q4xCdhIc89K0SMm2YHH%2BQIAdI%3D',
        },
      }, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function(res) {
          expect(res).to.have.property('canonical_url', 'https://peppermint-cdn.s3.amazonaws.com/AW3/cpLPai2DIqcETFtWsn0cWc');
          done();
        }
      });
    });
  });
});
