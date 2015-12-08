var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe('lambda:QueryAccounts', function() {
  var user = _.fake.user();

  before(function() {
    return _.fake.account(user);
  });

  after(_.deleteAccountAfter(user.email));

  describe('valid requests', function() {
    describe('with an email associated with an account', function() {
      describe('with an unverified account', function() {
        it('should return a 200 response with a single item.', function(done) {
          handler({
            api_key: _.fake.API_KEY,
            email: user.email,
          }, {
            succeed: function(r) {
              expect(r.length).to.equal(1);
              expect(r[0]).to.deep.equal({
                email: user.email.toLowerCase(),
                is_verified: false,
              });
              done();
            },
            fail: function(err) {
              done(new Error(err));
            },
          });
        });
      });

      describe('with a verified account', function() {
        before(function() {
          return _.verifyAccount(user.email, '127.0.0.1');
        });

        it('should return a 200 response with a single item.', function(done) {
          handler({
            api_key: _.fake.API_KEY,
            email: user.email,
          }, {
            succeed: function(r) {
              expect(r.length).to.equal(1);
              expect(r[0]).to.deep.equal({
                email: user.email.toLowerCase(),
                is_verified: true,
              });
              done();
            },
            fail: function(err) {
              done(new Error(err));
            },
          });
        });
      });
    });

    describe('with an email that does not belong to an account', function() {
      it('should return an empty 200 response array.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          email: _.fake.user().email,
        }, {
          succeed: function(data) {
            expect(data).to.deep.equal([]);
            done();
          },
          fail: function(err) {
            done(new Error(err));
          },
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
