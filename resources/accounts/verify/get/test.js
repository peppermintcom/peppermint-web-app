var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe('lambda:VerifyEmail', function() {
  var user = _.fake.user();

  before(function() {
    return _.fake.account(user);
  });

  describe('with a valid jwt', function() {
    it('should record the validation time and ip.', function(done) {
      var jwt = _.jwt.encode(user.email, 30);

      handler({jwt: jwt, ip: '127.0.0.1'}, {
        fail: function(err) {done(new Error(err));},
        succeed: function() {
          _.dynamo.get('accounts', {email: {S: user.email}}, true)
            .then(function(account) {
              expect(account).to.have.property('verification_ts');
              expect(account.verification_ip).to.deep.equal({S: '127.0.0.1'});
              done();
            })
            .catch(done);
        },
      });
    });
  });

  describe('with an expired jwt', function() {
    it('should fail with an Unauthorized error.', function(done) {
      var jwt = _.jwt.encode(user.email, -10);

      handler({jwt: jwt, ip: '127.0.0.1'}, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized.*Expired/);
          done();
        },
        succeed: function() {
          done(new Error('success with expired token'));
        },
      });
    });
  });

  //unverified clients have jwts that assert the account_id; these must not be
  //capable of verifying an email address;
  //JWTs wtih email addresses are only emailed
  describe('with an account_id jwt', function() {
    it('should fail with an Unauthorized error.', function(done) {
      var jwt = _.jwt.creds(user.account_id);

      handler({jwt: jwt, ip: '127.0.0.1'}, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized/);
          done();
        },
        succeed: function() {
          done(new Error('success with jwt without email'));
        },
      });
    });
  });
});
