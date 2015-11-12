var expect = require('chai').expect;
var http = require('request');
var _ = require('utils/test');
var post = _.partial(_.http, 'POST', '/accounts/tokens', {api_key: _.fake.API_KEY});

describe.only('POST /accounts/tokens', function() {
  var user = _.fake.user();

  before(function() {
    return _.http('POST', '/accounts', {
      api_key: _.fake.API_KEY,
      u: user,
    });
  });

  after(_.deleteAccountAfter(user.email));

  describe('with valid credentials', function() {
    it('should return a 200 response.', function() {
      return post({
          Authorization: _.basic(user.email, user.password),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('at');
          expect(res.body).to.have.property('u');
          expect(res.body.u).to.have.property('account_id');
          expect(res.body.u).to.have.property('full_name');
          expect(res.body.u).to.have.property('email');
          expect(res.body.u).not.to.have.property('password');
        });
    });
  });
});
