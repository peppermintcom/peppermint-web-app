var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:CreateAccount', function() {
  describe('Valid', function() {
    var user = _.fake.user();

    after(function() {
      return _.deleteAccount(user.email.toLowerCase());
    });

    it('should invoke succeed with a user account.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        u: user,
      }, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function(r) {
          expect(r).to.have.property('at');
          expect(r.at).to.match(/^[\w\-]+\.[\w\-]+\.[\w\-]+$/);
          expect(r).to.have.property('u');
          expect(r.u).to.have.property('account_id');
          expect(r.u).to.have.property('email', user.email.toLowerCase());
          expect(r.u).to.have.property('full_name', user.full_name);
          expect(r.u).to.have.property('registration_ts');
          expect(r.u).to.have.property('is_verified', false);
          expect(r.u).not.to.have.property('password');
          done();
        }
      });
    });
  });

  describe('Duplicate email', function() {
    var user = _.fake.user();

    before(function() {
      return _.fake.account(user);
    });

    after(function() {
      return _.deleteAccount(user.email.toLowerCase());
    });

    it('should invoke reply.fail with a Conflict error', function(done) {
      handler({
          api_key: _.fake.API_KEY,
          u: user,
        }, {
        success: function() {
          done(new Error('duplicate email accepted'));
        },
        fail: function(err) {
          expect(err).to.match(/^Conflict/);
          expect(err).to.match(/email/);
          done();
        },
      });
    });
  });

  describe('unknown api_key', function() {
    it('should invoke reply.fail with an Unauthorized error', function(done) {
      handler({
        api_key: 'xyz',
        u: _.fake.user(),
      }, {
        success: function() {
          done(new Error('invalid API key accepted'));
        },
        fail: function(err) {
          expect(err).to.match(/^Unauthorized/);
          expect(err).to.match(/api_key/);
          done();
        },
      });
    });
  });

  describe('Invalid Input Data', function() {
    [{
      given: 'no api_key',
      req: {
        u: _.fake.user(),
      },
      errMatches: [/^Bad Request/, /Missing required property/, /api_key/],
    }, {
      given: 'no user',
      req: {
        api_key: 'abc123',
      },
      errMatches: [/^Bad Request/, /Missing required property/, /u$/],
    }].forEach(function(t) {
      describe(t.given, function() {
        it('should invoke reply.fail with a Bad Request error.', function(done) {
          handler(t.req, {
            succeed: function() {
              done(new Error('succeed'));
            },
            fail: function(err) {
              expect(err).to.be.ok;
              t.errMatches.forEach(function(rx) {
                expect(err).to.match(rx);
              });
              done();
            },
          });
        });
      });
    });
  });
});
