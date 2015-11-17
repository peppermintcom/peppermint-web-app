var expect = require('chai').expect;
var _ = require('utils/test');

//depends on password reset form on peppermint.com
describe.skip('PUT /accounts', function() {
  var user = _.fake.user();
  var pass = 'my new password';
  var jwt;

  before(function() {
    return _.http('POST', '/accounts', {
        api_key: _.fake.API_KEY,
        u: user,
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(201);
        jwt = res.body.at;
      });
  });

  after(_.deleteAccountAfter(user.email));

  describe('with a valid auth token', function() {
    it('should update the password.', function() {
      return _.http('PUT', '/accounts', {
          api_key: _.fake.API_KEY,
          u: {
            password: pass,
          },
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(201);
          expect(res.body).to.deep.equal({});

          return _.http('POST', '/accounts/tokens', {
            api_key: _.fake.API_KEY,
          }, {
            Authorization: _.basic(user.email, pass),
          });
        })
        .then(function(res) {
          console.log(res.statusCode);
          console.log(res.body);
          expect(res.statusCode).to.equal(200);
        });
    });
  });
});
