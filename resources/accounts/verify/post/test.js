var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe('lambda:ReverifyEmail', function() {
  var user = null;

  before(function() {
    return _.fake.account().then(function(_user) {
      user = _user;
    });
  });

  after(function() {
    return _.deleteAccount(user.email);
  });

  describe('authenticated users', function() {
    it('should send a verification email.', function(done) {
      handler({
        Authorization: 'Bearer ' + _.jwt.creds(user.account_id),
      }, {
        fail: function(err) {done(new Error(err));},
        succeed: done,
      });
    });
  })
});
