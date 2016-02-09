var expect = require('chai').expect;
var tv4 = require('tv4');
var jsonapischema = require('./jsonapischema');
var spec = require('../resources/accounts/_account_id_/relationships/receivers/post/spec');
var _ = require('utils/test');

describe('POST /accounts/:id/relationships/receivers', function() {
  var account, recorder, accountID, recorderID, jwt, post;

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
        post = _.partial(_.http, 'POST', '/accounts/' + accountID + '/relationships/receivers');

        return auth(recorder.recorder_client_id, recorder.recorder_key, account.email, account.password);
      })
      .then(function(_jwt) {
        jwt = _jwt;
      });
  });

  describe('valid requests', function() {
    var response;

    before(function() {
      return post({
        data: [{type: 'recorders', id: recorderID}],
      }, {
        'Authorization': 'Bearer ' + jwt,
        'X-Api-Key': _.fake.API_KEY,
        'Content-Type': 'application/vnd.api+json',
      })
      .then(function(res) {
        response = res;
      });
    });

    it('should have a 204 status code.', function() {
      expect(response.statusCode).to.equal(204);
    });

    it('should return no body.', function() {
      expect(response.headers).to.have.property('content-length', '0');
      expect(response.headers).not.to.have.property('content-type');
      expect(response.body).to.equal(undefined);
    });

    it('should link the account and recorder in the database.', function() {
      return _.receivers.get(recorderID, accountID)
        .then(function(record) {
          expect(record).to.be.ok;
        });
    });
  });

  describe('unformatted request body', function() {
    var response;

    before(function() {
      return post({
        //should be an array
        data: {type: 'recorders', id: recorderID},
      }, {
        'Authorization': 'Bearer ' + jwt,
        'X-Api-Key': _.fake.API_KEY,
        'Content-Type': 'application/vnd.api+json',
      })
      .then(function(res) {
        response = res;
      });
    });

    it('should have a 400 status code.', function() {
      expect(response.statusCode).to.equal(400);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should return body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'Invalid type: object (expected array)'}],
      });
      if (!tv4.validate(response.body, spec.responses['400'].schema)) {
        throw tv4.error;
      }
    });
  });

  describe('Authorization header is for recorder only', function() {
    var response;

    before(function() {
      return auth(recorder.recorder_client_id, recorder.recorder_key)
        .then(function(token) {
          return post({
            data: [{type: 'recorders', id: recorderID}],
          }, {
            Authorization: 'Bearer ' + token,
            'X-Api-Key': _.fake.API_KEY,
            'Content-Type': 'application/vnd.api+json',
          })
        })
        .then(function(res) {
          response = res;
        });
    });

    it('should have a 401 status code.', function() {
      expect(response.statusCode).to.equal(401);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should return body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'Auth token is not valid for any account'}],
      });
      if (!tv4.validate(response.body, spec.responses['401'].schema)) {
        throw tv4.error;
      }
    });
  });

  describe('Authorization header is for account only', function() {
    var response;

    before(function() {
      return auth(null, null, account.email, account.password)
        .then(function(token) {
          return post({
            data: [{type: 'recorders', id: recorderID}],
          }, {
            Authorization: 'Bearer ' + token,
            'X-Api-Key': _.fake.API_KEY,
            'Content-Type': 'application/vnd.api+json',
          })
        })
        .then(function(res) {
          response = res;
        });
    });

    it('should have a 401 status code.', function() {
      expect(response.statusCode).to.equal(401);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should return body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'Auth token is not valid for any recorder'}],
      });
      if (!tv4.validate(response.body, spec.responses['401'].schema)) {
        throw tv4.error;
      }
    });
  });

  describe('account_id path param differs from JWT account_id', function() {
    var response;

    before(function() {
      return _.http('POST', '/accounts/xxx/relationships/receivers', {
        data: [{type: 'recorders', id: recorderID}],
      }, {
        'Authorization': 'Bearer ' + jwt,
        'X-Api-Key': _.fake.API_KEY,
        'Content-Type': 'application/vnd.api+json',
      })
      .then(function(res) {
        response = res;
      });
    });

    it('should have a 403 status code.', function() {
      expect(response.statusCode).to.equal(403);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should return body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'Auth token is not valid for account xxx'}],
      });
      if (!tv4.validate(response.body, spec.responses['403'].schema)) {
        throw tv4.error;
      }
    });
  });

  describe('body recorder_id property differs from JWT recorder_id', function() {
    var response;

    before(function() {
      return post({
        data: [{type: 'recorders', id: 'xxx'}],
      }, {
        'Authorization': 'Bearer ' + jwt,
        'X-Api-Key': _.fake.API_KEY,
        'Content-Type': 'application/vnd.api+json',
      })
      .then(function(res) {
        response = res;
      });
    });

    it('should have a 403 status code.', function() {
      expect(response.statusCode).to.equal(403);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should return body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'Auth token is not valid for recorder xxx'}],
      });
      if (!tv4.validate(response.body, spec.responses['403'].schema)) {
        throw tv4.error;
      }
    });
  });

  describe('without Authorization header response', function() {
    var response;

    before(function() {
      return post({
        data: [{type: 'recorders', id: recorderID}],
      }, {
        'X-Api-Key': _.fake.API_KEY,
        'Content-Type': 'application/vnd.api+json',
      })
      .then(function(res) {
        response = res;
      });
    });

    it('should have a 401 status code.', function() {
      expect(response.statusCode).to.equal(401);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should have a body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'Authorization header should be formatted: Bearer <JWT>'}],
      });
      if (!tv4.validate(response.body, spec.responses['401'].schema)) {
        throw tv4.error;
      }
    });
  });

  describe('incorrect Content-Type response', function() {
    var response;

    before(function() {
      return post({
        data: [{type: 'recorders', id: recorderID}],
      }, {
        'Content-Type': 'application/json',
        'X-Api-Key': _.fake.API_KEY,
        Authorization: jwt,
      })
      .then(function(res) {
        response = res;
      });
    });

    it('should have statusCode 415', function() {
      expect(response.statusCode).to.equal(415);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should have body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'Use "application/vnd.api+json"'}],
      });
      if (!tv4.validate(response.body, spec.responses['415'].schema)) {
        throw tv4.error;
      }
    });
  });

  describe('missing API Key', function() {
    var response;

    before(function() {
      return post({
        data: [{type: 'recorders', id: recorderID}],
      }, {
        'Authorization': 'Bearer ' + jwt,
        'Content-Type': 'application/vnd.api+json',
      })
      .then(function(res) {
        response = res;
      });
    });

    it('should have a 400 status code.', function() {
      expect(response.statusCode).to.equal(400);
    });

    it('should return valid JSON API content.', function() {
      expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
      if (!tv4.validate(response.body, jsonapischema)) {
        throw tv4.error;
      }
    });

    it('should have body matching spec.', function() {
      expect(response.body).to.deep.equal({
        errors: [{detail: 'invalid API Key'}],
      });
      if (!tv4.validate(response.body, spec.responses['415'].schema)) {
        throw tv4.error;
      }
    });
  });
});

function auth(recorderUser, recorderPass, accountUser, accountPass) {
  return _.http('POST', '/jwts', {}, {
    Authorization: _.peppermintScheme(recorderUser, recorderPass, accountUser, accountPass),
    'X-Api-Key': _.fake.API_KEY,
  })
  .then(function(response) {
    if (response.statusCode !== 200) {
      console.log(response.body);
      throw new Error(response.statusCode);
    }
    return response.body.data.attributes.token;
  });
}
