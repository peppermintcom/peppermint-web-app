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
      it('should return a 401 Unauthorized response.', function() {
        return _.http('GET', '/accounts?email=' + user.email, null, {
            'X-Api-Key': _.fake.API_KEY,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.body).to.have.property('errorMessage', 'Unauthorized');
          });
      });
    });

    describe('with new email', function() {
      it('should return a 404 Not Found response.', function() {
        return _.http('GET', '/accounts?email=x' + user.email, null, {
            'x-api-key': _.fake.API_KEY,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(404);
            expect(res.body).to.have.property('errorMessage', 'Not Found');
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
