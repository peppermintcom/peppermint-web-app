var expect = require('chai').expect;
var _ = require('utils/test');
var post = _.partial(_.http, 'POST', '/accounts');

describe('POST /accounts', function() {
  describe('with valid api_key, email, password, and name', function() {
    var user = _.fake.user();

    after(_.deleteAccountAfter(user.email.toLowerCase()));

    it('should return a 201 with a JWT and account info.', function() {
      return post({
          api_key: _.fake.API_KEY,
          u: user,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(201);
          expect(res.body).to.have.property('at');
          expect(res.body).to.have.property('u');
          expect(res.body.u).to.have.property('account_id');
          expect(res.body.u).to.have.property('email', user.email.toLowerCase());
          expect(res.body.u).to.have.property('full_name', user.full_name);
          expect(res.body.u).to.have.property('registration_ts');
        });
    });
  });

  describe('without an api_key', function() {
    var user = _.fake.user();

    after(_.deleteAccountAfter(user.email.toLowerCase()));

    it('should return a 400 error.', function() {
      return post({
          u: user,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body.errorMessage).to.match(/api_key/);
        });
    });
  });

  describe('without a user property', function() {
    it('should return a 400 error.', function() {
      return post({
          api_key: _.fake.API_KEY,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body.errorMessage).to.match(/\su$/);
        });
    });
  });

  describe('without an email', function() {
    it('should return a 400 error.', function() {
      return post({
          api_key: _.fake.API_KEY,
          u: _.omit(_.fake.user(), 'email'),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body.errorMessage).to.match(/email/);
        });
    });
  });

  describe('without a full_name', function() {
    it('should return a 400 error.', function() {
      return post({
          api_key: _.fake.API_KEY,
          u: _.omit(_.fake.user(), 'full_name'),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body.errorMessage).to.match(/full_name/);
        });
    });
  });

  describe('without a password', function() {
    it('should return a 400 error.', function() {
      return post({
          api_key: _.fake.API_KEY,
          u: _.omit(_.fake.user(), 'password'),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body.errorMessage).to.match(/password/);
        });
    });
  });

  describe('with a bad api_key', function() {
    var user = _.fake.user();

    after(_.deleteAccountAfter(user.email.toLowerCase()));

    it('should return a 401 error.', function() {
      return post({
          api_key: _.fake.API_KEY + 'x',
          u: user,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/api_key/);
        });
    });
  });

  describe('with an existing email', function() {
    var user = _.fake.user();
    var body = {
      api_key: _.fake.API_KEY,
      u: user,
    };

    before(function() {
      return post(body).then(function(res) {
        expect(res.statusCode).to.equal(201);
      });
    });

    after(_.deleteAccountAfter(user.email.toLowerCase()));

    it('should return a 409 error.', function() {
      return post(body)
        .then(function(res) {
          expect(res.statusCode).to.equal(409);
          expect(res.body.errorMessage).to.match(/email/);
        });
    });
  });
});
