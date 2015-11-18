var readline = require('readline');
var expect = require('chai').expect;

//uses password reset form on peppermint.com
describe.skip('Forgot Password', function() {
  var user = _.fake.user();
  var pass = 'secret2';
  var jwt;

  before(function() {
    return _.http('POST', '/accounts', {
        api_key: _.fake.API_KEY,
        u: user,
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(201);
        jwt = res.body.at;
      });
  });

  after(_.deleteAccountAfter(user.email));

  describe('POST /accounts/recover', function() {
    it('should send an email with a password reset link.', function() {
      return _.http('POST', '/accounts/recover', {
          api_key: _.fake.API_KEY,
          email: user.email,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
        });
    });
  });

  //depends on above POST /accounts/recover test
  //The reset form uses the PUT /accounts method
  describe('change password at peppermint.com/reset', function() {
    before(function(done) {
      this.timeout(120000);

      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question([
        'Use password reset link emailed to',
        user.email,
        'to change password to',
        pass,
        'then hit enter.',
      ].join(' '), function() {
        rl.close();
        done();
      });
    });

    it('should be able to authenticate with new password.', function() {
      return _.http('POST', '/accounts/tokens', {
          api_key: _.fake.API_KEY,
        }, {
          Authorization: _.basic(user.email, pass),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('at');
        });
    });
  });
});
