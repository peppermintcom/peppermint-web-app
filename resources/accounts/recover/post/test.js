var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe('lambda:RecoverAccount', function() {
  var user = _.fake.user();

  before(function() {
    return _.fake.account(user);
  });

  after(function() {
    return _.deleteAccount(user.email);
  });

  describe('with an api_key and existing email', function() {
    it('should send an email with a password reset link.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        email: user.email,
      }, {
        fail: function(err) {done(new Error(err));},
        succeed: function(r) {
          //mandrill API is too slow to check for email here
          done();
        },
      });
    });
  });

  describe('without an api_key', function() {
    it('should fail with a Bad Request error.', function(done) {
      handler({
        email: user.email,
      }, {
        fail: function(err) {
          expect(err).to.match(/Bad Request.*api_key/);
          done();
        },
        succeed: function() {
          done(new Error('Success without api_key'));
        },
      });
    });
  });

  describe('without an email', function() {
    it('should fail with a Bad Request error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
      }, {
        fail: function(err) {
          expect(err).to.match(/Bad Request.*email/);
          done();
        },
        succeed: function() {
          done(new Error('Success without email'));
        },
      });
    });
  });

  describe('with unknown email', function() {
    it('should fail with a Not Found error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        email: 'x' + user.email,
      }, {
        fail: function(err) {
          expect(err).to.match(/Not Found.*email/);
          done();
        },
        succeed: function() {
          done(new Error('Success with unknown email'));
        },
      })
    });
  });
});
