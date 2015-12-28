var expect = require('chai').expect;
var readline = require('readline');
var http = require('request');
var _ = require('utils/test');
var post = _.partial(_.http, 'POST', '/accounts/verify', {});

describe('POST /accounts/verify', function() {
  var user = _.fake.user();
  var jwt;

  before(function() {
    return _.http('POST', '/accounts', {
        api_key: _.fake.API_KEY,
        u: user,
      })
      .then(function(res) {
        jwt = res.body.at;
      });
  });

  after(_.deleteAccountAfter(user.email.toLowerCase()));

  describe('with a valid jwt', function() {

    before(function() {
      return post({
          'Authorization': 'Bearer ' + jwt,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
        });
    });

    it('should respond with a verified message.', function(done) {
      this.timeout(90000);

      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question([
        'Click the newest verification link emailed to ',
        user.email,
        '. Do you see a "Verified" message? [Y/N]',
      ].join(''), function(ok) {
        rl.close();
        if (/[yY]/.test(ok)) {
          done();
          return;
        }
        done(new Error(ok));
      });
    });

    it('should save the ip and time of click in the database.', function() {
      return _.dynamo.get('accounts', {
          email: {S: user.email.toLowerCase()},
        })
        .then(function(account) {
          expect(account).to.have.property('verification_ts');
          expect(account).to.have.property('verification_ip');
        });
    });
  });

  describe('without an Authorization header', function() {
    it('should return a 401 error.', function() {
      return _.http('POST', '/accounts/verify', {})
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
        });
    });
  });

  describe('with a bad token', function() {
    it('should return a 401 error.', function() {
      return post({
          'Authorization': 'Bearer ' + jwt + 'x',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
        });
    });
  });
});
