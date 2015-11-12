var expect = require('chai').expect;
var handler = require('./').handler;
var signin = require('../tokens/post').handler;
var _ = require('utils/test');

describe('lambda:ChangePassword', function() {
  var user = _.fake.user();
  var pass = 'new secret';

  before(function() {
    return _.fake.account(user);
  });

  after(function() {
    return _.deleteAccount(user.email);
  });

  describe('with a valid jwt and password', function() {
    it('should update the user password.', function(done) {
      var Authorization = 'Bearer ' + _.jwt.encode(user.email, 60);

      handler({
        Authorization: Authorization,
        body: {
          api_key: _.fake.API_KEY,
          u: {
            password: pass,
          },
        }
      }, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function() {
          //try logging in with the new password
          signin({
            Authorization: _.basic(user.email, pass),
            api_key: _.fake.API_KEY,
          }, {
            succeed: function(r) {
              done();
            },
            fail: function(err) {
              done(new Error(err));
            },
          });
        },
      });
    });
  });

  describe('without an Authorization header', function() {
    it('should return an Unauthorized error.', function(done) {
      handler({
        body: {
          u: {
            password: pass,
          },
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized/);
          done();
        },
        succeed: function(r) {
          done(new Error('success without Authorization'));
        },
      });
    });
  });

  describe('without a password', function() {
    it('should return a Bad Request error.', function(done) {
      handler({
        Authorization: 'Bearer ' + _.jwt.encode(user.email, 60),
        body: {
          api_key: _.fake.API_KEY,
          u: {},
        },
      }, {
        fail: function(err) {
          expect(err).to.match(/Bad Request.*password/);
          done();
        },
        succeed: function(r) {
          done(new Error('success without password'));
        },
      });
    });
  });
});
