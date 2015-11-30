var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe.only('lambda:QueryAccounts', function() {
  var user = _.fake.user();

  before(function() {
    return _.fake.account(user);
  });

  after(_.deleteAccountAfter(user.email));

  describe('valid requests', function() {
    describe('with an email associated with an account', function() {
      it('should return a 401 Unauthorized response.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          email: user.email,
        }, {
          succeed: noSucceed(done),
          fail: failMatch(/^Unauthorized/, done),
        });
      });
    });

    describe('with an email that does not belong to an account', function() {
      it('should return a 404 Not Found response.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          email: _.fake.user().email,
        }, {
          succeed: noSucceed(done),
          fail: failMatch(/^Not Found/, done),
        });
      });
    });
  });

  describe('without api_key', function() {
    it('should return 400 Bad Request error.', function(done) {
      handler({
        email: user.emai,
      }, {
        succeed: noSucceed(done),
        fail: failMatch(/^Bad Request/, done),
      });
    });
  });

  describe('with unknown api_key', function() {
    it('should return a 401 Unauthorized error.', function(done) {
      handler({
        api_key: _.fake.API_KEY + 'x',
        email: user.email,
      }, {
        succeed: noSucceed(done),
        fail: failMatch(/^Unauthorized.*api.key/, done)
      });
    });
  });

  describe('without email', function() {
    it('should return a 400 Bad Request error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
      }, {
        succeed: noSucceed(done),
        fail: failMatch(/Bad Request/, done),
      });
    });
  });
});

function noSucceed(done) {
  return function() {
    done(new Error('success without authentication'));
  };
}

//assertions take place in promise then so catch assertion errors
function failMatch(rx, done) {
  return function(err) {
    try {
      expect(err).to.match(rx);
    } catch(e) {
      done(e);
      return;
    }
    done();
  };
}
