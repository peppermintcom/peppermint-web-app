var expect = require('chai').expect;
var _ = require('utils/test');

describe('GET /accounts', function() {
  var user = _.fake.user();

  before(function() {
    return _.http('POST', '/accounts', {
      api_key: _.fake.API_KEY,
      u: user,
    });
  });

  after(_.deleteAccountAfter(user.email.toLowerCase()));

  describe('valid requests', function() {
    describe('when email has been registered', function() {
      describe('but not verified', function() {
        it('should return a 200 response with an array with 1 account marked unverified.', function() {
          return _.http('GET', '/accounts?email=' + user.email, null, {
              'X-Api-Key': _.fake.API_KEY,
            })
            .then(function(res) {
              expect(res.statusCode).to.equal(200);
              expect(res.body).to.have.length(1);
              expect(res.body[0]).to.deep.equal({
                is_verified: false,
                email: user.email.toLowerCase(),
              });
            });
        });
      });

      describe('and verified', function() {
        before(function() {
          return _.verifyAccount(user.email, '127.0.0.1');
        });

        it('should return a 200 response with an array with 1 account marked verified.', function() {
          return _.http('GET', '/accounts?email=' + user.email, null, {
              'X-Api-Key': _.fake.API_KEY,
            })
            .then(function(res) {
              expect(res.statusCode).to.equal(200);
              expect(res.body).to.have.length(1);
              expect(res.body[0]).to.deep.equal({
                is_verified: true,
                email: user.email.toLowerCase(),
              });
            });
        });
      });
    });

    describe('with new email', function() {
      it('should return a 200 response with an empty array.', function() {
        return _.http('GET', '/accounts?email=x' + user.email, null, {
            'x-api-key': _.fake.API_KEY,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.deep.equal([]);
          });
      });
    });
  });

  describe('without X-Api-Key header', function() {
    it('should return a 400 Bad Request error.', function() {
      return _.http('GET', '/accounts?email=' + user.email)
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.have.property('errorMessage');
          expect(res.body.errorMessage).to.match(/api_key/);
        });
    });
  });

  describe('with unknown X-Api-Key header', function() {
    it('should return a 401 Unauthorized error.', function() {
      return _.http('GET', '/accounts?email=' + user.email, null, {
          'X-Api-Key': 'x' + _.fake.API_KEY,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('errorMessage');
          expect(res.body.errorMessage).to.match(/api_key/);
        });
    });
  });

  describe('without an email in the querystring', function() {
    it('should return a 400 Bad Request error.', function() {
      return _.http('GET', '/accounts', null, {
          'X-Api-Key':  _.fake.API_KEY,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.have.property('errorMessage');
          expect(res.body.errorMessage).to.match(/email/);
        });
    });
  });
});
