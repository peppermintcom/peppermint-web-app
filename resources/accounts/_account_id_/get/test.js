var expect = require('chai').expect;
var handler = require('./').handler;
var verify = require('../../verify/get').handler;
var _ = require('utils/test');

describe('lambda:GetAccount', function() {
  var account = null;
  var token;

  before(function() {
    return _.fake.account().then(function(_account) {
      account = _account;
      token = 'Bearer ' + _.jwt.creds(account.account_id);
    });
  });

  describe('valid requests', function() {
    it('should return the account profile.', function(done) {
      handler({
        Authorization: token,
        account_id: account.account_id,
      }, {
        succeed: function(_account) {
          expect(_account).to.have.property('account_id', account.account_id);
          expect(_account).to.have.property('email', account.email.toLowerCase());
          expect(_account).to.have.property('full_name', account.full_name);
          expect(_account).to.have.property('is_verified', false);
          expect(_account).to.have.property('registration_ts', account.registration_ts);
          expect(_account).not.to.have.property('password');
          expect(_account).not.to.have.property('verification_ts');
          expect(_account).not.to.have.property('verification_ip');
          done();
        },
        fail: function(err) {
          done(new Error(err));
        }
      });
    });

    describe('verified accounts', function() {
      before(function(done) {
        verify({
          jwt: _.jwt.encode(account.email.toLowerCase(), 60),
          ip: '127.0.0.1',
        }, {
          succeed: function() {
            done();
          },
          fail: function(err) {
            done(new Error(err));
          },
        });
      });

      it('should be marked as verified.', function() {
        handler({
          Authorization: token,
          account_id: account.account_id,
        }, {
          succeed: function(_account) {
            expect(_account).to.have.property('is_verified', true);
            expect(_account).not.to.have.property('verification_ts');
            expect(_account).not.to.have.property('verification_ip');
            done();
          },
          fail: function(err) {
            done(new Error(err));
          },
        });
      });
    });
  });

  describe('without Authorization', function() {
    it('should return an Unauthorized error.', function(done) {
      handler({
        Authorization: '',
        account_id: account.account_id,
      }, {
        succeed: function() {
          done(new Error('success without Authorization credentials'));
        },
        fail: function(err) {
          expect(err).to.match(/Unauthorized/);
          done();
        },
      });
    });
  });

  describe('without account_id', function() {
    it('should return a Bad Request error.', function(done) {
      handler({
        Authorization: token,
        account_id: '',
      }, {
        succeed: function() {
          done(new Error('success without account_id'));
        },
        fail: function(err) {
          expect(err).to.match(/Bad Request/);
          done();
        },
      });
    });
  });

  describe('with mismatch between authenticated account and path param', function() {
    it('should return a Forbidden error.', function(done) {
      handler({
        Authorization: 'Bearer ' + _.jwt.creds(_.token(22)),
        account_id: account.account_id,
      }, {
        succeed: function() {
          done(new Error('success with non-owned account'));
        },
        fail: function(err) {
          expect(err).to.match(/Forbidden/);
          done();
        },
      });
    });
  });

  describe('with non-existent account', function() {
    it('should return a Not Found error.', function(done) {
      var accountID = _.token(22);

      handler({
        Authorization: 'Bearer ' + _.jwt.creds(accountID),
        account_id: accountID,
      }, {
        succeed: function() {
          done(new Error('success without a real account'));
        },
        fail: function(err) {
          expect(err).to.match(/Not Found/);
          done();
        },
      });
    });
  });
});
