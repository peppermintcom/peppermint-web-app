var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:AccountSignIn', function() {
  var user = _.fake.user();

  before(function() {
    return _.fake.account(user)
      .then(function(account) {
        user.account_id = account.account_id;
      });
  });

  after(function() {
    return _.deleteAccount(user.email.toLowerCase());
  });

  describe('with valid credentials', function() {
    it('should return a JWT.', function(done) {
      var Authorization = 'Basic ' + new Buffer(user.email + ':' + user.password).toString('base64');

      handler({
        Authorization: Authorization,
        api_key: _.fake.API_KEY,
      }, {
        succeed: function(r) {
          var jwt = _.jwt.verify(r.at);

          expect(r).to.have.property('at');
          expect(r).to.have.property('u');
          expect(r.u).to.have.property('account_id', user.account_id);
          expect(r.u).to.have.property('email', user.email.toLowerCase());
          expect(r.u).to.have.property('full_name', user.full_name);
          expect(r.u).to.have.property('registration_ts');
          expect(r.u).to.have.property('is_verified', false);
          expect(jwt.payload.sub).to.equal(user.account_id + '.');
          done();
        },
        fail: function(err) {
          done(new Error(err));
        },
      });
    });
  });

  describe('with an unknown email', function() {
    it('should return an Unauthorized error.', function(done) {
      var Authorization = 'Basic ' + new Buffer(user.email + 'x:' + user.password).toString('base64');

      handler({
        Authorization: Authorization,
        api_key: _.fake.API_KEY,
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized.*email/);
          done();
        },
        succeed: function(r) {
          done(new Error('success with bad email!'));
        },
      });
    });
  });

  describe('with wrong password', function() {
    it('should return an Unauthorized error.', function(done) {
      var Authorization = 'Basic ' + new Buffer(user.email + ':x' + user.password).toString('base64');

      handler({
        Authorization: Authorization,
        api_key: _.fake.API_KEY,
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized.*password/);
          done();
        },
        succeed: function(r) {
          done(new Error('success with wrong password!'));
        },
      });
    });
  });
});
