var expect = require('chai').expect;
var tv4 = require('tv4');
var jsonapischema = require('./jsonapischema');
var spec = require('../resources/accounts/_account_id_/relationships/receivers/_recorder_id_/delete/spec');
var _ = require('utils/test');

describe('DELETE /accounts/:id/relationships/receivers/:id', function() {
  var account, recorder, accountID, recorderID, del;
  var recorderJWT, accountJWT;

  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.recorder(),
    ])
    .then(function(results) {
      account = results[0];
      recorder = results[1].recorder;
      accountID = account.account_id;
      recorderID = recorder.recorder_id;
      del = _.partial(_.http, 'DELETE', '/accounts/' + accountID + '/relationships/receivers/' + recorderID, null);
    });
  });

  before(function() {
    return Promise.all([
      _.auth(recorder.recorder_client_id, recorder.recorder_key),
      _.auth(null, null, account.email, account.password),
    ])
    .then(function(results) {
      recorderJWT = results[0];
      accountJWT = results[1];
    });
  });

  before(function() {
    return _.receivers.link(recorder.recorder_id, account.account_id);
  });

  it('should respond with 204 status.', function() {
    return del({
      'X-Api-Key': _.fake.API_KEY,
      Authorization: 'Bearer ' + recorderJWT,
    })
    .then(function(response) {
      expect(response.statusCode).to.equal(204);
      expect(response.body).not.to.be.ok;
      expect(response.headers).not.to.have.property('content-type');
    });
  });

  it('should delete the relationship in the database.', function() {
    return _.receivers.get(recorder.recorder_id, account.account_id)
      .then(function(record) {
        expect(record).not.to.be.ok;
      });
  });

  describe('unknown X-Api-Key', function() {
    var response;

    it('should respond with a 400 status.', function() {
      return del({
        'X-Api-Key': _.fake.API_KEY + 'x',
        Authorization: 'Bearer ' + recorderJWT,
      })
      .then(function(_response) {
        response = _response;
        expect(response.statusCode).to.equal(400);
      });
    });

    it('should responde with a jsonapi error.', function() {
      validateResponse('401', response);
    });
  });

  describe('no Authorization header', function() {
    var response;

    it('should respond with a 401 status.', function() {
      return del({
        'X-Api-Key': _.fake.API_KEY,
      })
      .then(function(_response) {
        response = _response;
        expect(response.statusCode).to.equal(401);
      });
    });

    it('should responde with a jsonapi error.', function() {
      validateResponse('401', response);
    });
  });

  describe('Authorization header only authenticates account', function() {
    var response;

    it('should respond with a 403 status.', function() {
      return del({
        'X-Api-Key': _.fake.API_KEY,
        Authorization: 'Bearer ' + accountJWT,
      })
      .then(function(_response) {
        response = _response;
        expect(response.statusCode).to.equal(403);
      });
    });

    it('should respond with a 403 json error.', function() {
      validateResponse('403', response);
    });
  });

  describe('Authorization header authenticates a different recorder', function() {
    var response;

    it('should respond with a 403 status.', function() {
      return del({
        'X-Api-Key': _.fake.API_KEY,
        Authorization: 'Bearer ' + accountJWT,
      })
      .then(function(_response) {
        response = _response;
        expect(response.statusCode).to.equal(403);
      });
    });

    it('should respond with a 403 json error.', function() {
      validateResponse('403', response);
    });
  });
});

function validateResponse(code, response) {
  expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
  if (!tv4.validate(response.body, spec.responses[code].schema)) {
    throw tv4.error;
  }
  if (!tv4.validate(response.body, jsonapischema)) {
    throw tv4.error;
  }
}
