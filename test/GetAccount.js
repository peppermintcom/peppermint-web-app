var readline = require('readline');
var expect = require('chai').expect;
var _ = require('utils/test');

describe('GET /accounts/{account_id}', function() {
  var user = _.fake.user();
  var needsDelete = true;
  var jwt, accountID;

  before(function() {
    return _.http('POST', '/accounts', {
        api_key: _.fake.API_KEY,
        u: user,
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(201);
        jwt = res.body.at;
        accountID = res.body.u.account_id;
      });
  });

  after(function() {
    if (needsDelete) {
      return _.deleteAccount(user.email.toLowerCase());
    }
  });

  describe('valid requests', function() {
    it('should return an account profile.', function() {
      return _.http('GET', '/accounts/' + accountID, {}, {
          Authorization: 'Bearer ' + jwt,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('account_id', accountID);
          expect(res.body.registration_ts).to.match(/201/);
          expect(res.body).to.have.property('email', user.email.toLowerCase());
          expect(res.body).to.have.property('full_name', user.full_name);
          expect(res.body).to.have.property('is_verified', false);
          expect(res.body).not.to.have.property('password');
        });
    });

    describe('for verified accounts', function() {
      before(function(done) {
        this.timeout(90000);

        var rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question([
          'Click the verification link emailed to ',
          user.email,
          ' then hit enter.',
        ].join(''), function() {
          rl.close();
          done();
        });
      });

      it('should be marked verified.', function() {
        return _.http('GET', '/accounts/' + accountID, {}, {
            Authorization: 'Bearer ' + jwt,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('account_id', accountID);
            expect(res.body.registration_ts).to.match(/201/);
            expect(res.body).to.have.property('email', user.email.toLowerCase());
            expect(res.body).to.have.property('full_name', user.full_name);
            expect(res.body).to.have.property('is_verified', true);
            expect(res.body).not.to.have.property('password');
          });
      });
    });
  });

  describe('without Authorization header', function() {
    it('should respond with a 401 Unauthorized error.', function() {
      return _.http('GET', '/accounts/' + accountID, {}, {})
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/Unauthorized/);
        });
    });
  });

  describe('with bad Authorization header', function() {
    it('should respond with a 401 Unauthorized error.', function() {
      return _.http('GET', '/accounts/' + accountID, {}, {
          Authorization: 'Bearer ' + jwt + 'x',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/Unauthorized/);
        });
    });
  });

  describe('non-owned accounts', function() {
    it('should respond with a 403 Forbidden error.', function() {
      return _.http('GET', '/accounts/x', {}, {
          Authorization: 'Bearer ' + jwt,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(403);
          expect(res.body.errorMessage).to.match(/Forbidden/);
        });
    });
  });

  //must be the last test because it deletes the test account
  describe('deleted accounts', function() {
    before(function() {
      needsDelete = false;
      return _.deleteAccount(user.email.toLowerCase());
    });

    it('should return a 404 Not Found error.', function() {
      return _.http('GET', '/accounts/' + accountID, {}, {
          Authorization: 'Bearer ' + jwt,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(404);
          expect(res.body.errorMessage).to.match(/Not Found/);
        });
    });
  });
});
