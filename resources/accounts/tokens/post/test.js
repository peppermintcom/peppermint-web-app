var expect = require('chai').expect;
var register = require('../../post').handler;
var handler = require('./').handler;
var _ = require('utils');

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

describe('account authentication', function() {
  before(function(done) {
    register({
      api_key: APP_API_KEY,
      u: user,
    }, {
      fail: done,
      succeed: function(r) {
        user.account_id = r.u.account_id;
        done();
      },
    });
  });

  after(deleteAccount(user.email));

  describe.only('with valid credentials', function() {
    it ('should return a JWT.', function(done) {
      var Authorization = 'Basic ' + new Buffer(user.email + ':' + user.password).toString('base64');

      handler({
        Authorization: Authorization,
        api_key: APP_API_KEY,
      }, {
        succeed: function(r) {
          var jwt = _.jwtVerify(r.at);

          expect(r).to.have.property('at');
          expect(r).to.have.property('u');
          expect(r.u).to.have.property('account_id', user.account_id);
          expect(r.u).to.have.property('email', user.email);
          expect(r.u).to.have.property('first_name', user.first_name);
          expect(r.u).to.have.property('last_name', user.last_name);
          expect(r.u).to.have.property('registration_ts');
          expect(jwt.payload.sub).to.equal(user.account_id + '.');
          done();
        },
        fail: function(err) {
          done(new Error(err));
        },
      });
    });
  });

  describe('Unknown email', function() {
    it('should return an Unauthorized error.', function(done) {
      var Authorization = 'Basic ' + new Buffer(clientID + 'x:' + recorder.recorder_key).toString('base64');

      handler({
        Authorization: Authorization,
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized.*recorder_client_id/);
          done();
        },
        succeed: function(r) {
          done(new Error('success with bad clientID!'));
        },
      });
    });
  });

  describe('Wrong recorder_key', function() {
    it('should return an Unauthorized error.', function(done) {
      var Authorization = 'Basic ' + new Buffer(clientID + ':x' + recorder.recorder_key).toString('base64');

      handler({
        Authorization: Authorization,
      }, {
        fail: function(err) {
          expect(err).to.match(/Unauthorized.*recorder_key/);
          done();
        },
        succeed: function(r) {
          done(new Error('success with wrong recorder_key!'));
        },
      });
    });
  });
});

function deleteAccount(email) {
  return function(done) {
    _.dynamo.deleteItem({
      Key: {email: {S: email}},
      TableName: 'accounts',
    }, done);
  };
}
