var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

//has to exist in the database app table
const APP_API_KEY = 'abc123';
const FIRST = 'John';
const LAST = 'Doe';
const PASSWORD = 'secret';

var user = {
  email: _.token(12) + '@mailinator.com',
  first_name: FIRST,
  last_name: LAST,
  password: PASSWORD,
};

describe('lambda:CreateAccount', function() {
  after(_.deleteAccount(user.email));

  describe('Valid', function() {
    var mandrillID;

    it('should invoke succeed with a user account.', function(done) {
      var reply = {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function(r) {
          expect(r).to.have.property('at');
          expect(r.at).to.match(/^[\w\-]+\.[\w\-]+\.[\w\-]+$/);
          expect(r).to.have.property('u');
          expect(r.u).to.have.property('account_id');
          expect(r.u).to.have.property('email', user.email);
          expect(r.u).to.have.property('first_name', FIRST);
          expect(r.u).to.have.property('last_name', LAST);
          expect(r.u).to.have.property('registration_ts');
          expect(r.u).not.to.have.property('password');

          mandrillID = reply.mandrill_id;
          done();
        }
      };

      handler({
        api_key: APP_API_KEY,
        u: user,
      }, reply);
    });
  });

  describe('Duplicate email', function() {
    var email = _.token(12) + '@mailinator.com';
    var req = {
      api_key: APP_API_KEY,
      u: _.assign({}, user, {email: email}),
    };

    before(function(done) {
      handler(req, {
        fail: function(err) {
          done(new Error(err));
        },
        succeed: function() {
          done();
        },
      });
    });

    after(_.deleteAccount(email));

    it('should invoke reply.fail with a Conflict error', function(done) {
      handler(req, {
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
    var email = _.token(12) + '@mailinator.com';

    it('should invoke reply.fail with an Unauthorized error', function(done) {
      handler({
        api_key: 'xyz',
        u: {
          email: email,
          first_name: FIRST,
          last_name: LAST,
          password: PASSWORD,
        },
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
        recorder: {
          recorder_client_id: 'abc123',
        },
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
