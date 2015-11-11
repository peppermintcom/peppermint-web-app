var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe('lambda:VerifyEmail', function() {
  var user = _.fake.user();

  before(function() {
    return _.fake.account(user);
  });

  after(function() {
    return _.deleteAccount(user.email);
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
});
