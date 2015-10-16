var expect = require('chai').expect;
var request = require('request');
var _ = require('utils');

const URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/recorder';
const API_KEY = 'abc123';

function call(body) {
  return new Promise(function(resolve, reject) {
    request({
      url: URL,
      method: 'POST',
      json: true,
      body: body,
    }, function(err, res, body) {
      if (err) {
        reject(err);
        return;
      }
      res.body = body;
      resolve(res);
    });
  });
}

describe('POST /recorder', function() {
  var clientID = Date.now().toString();
  var params = {
    api_key: API_KEY,
    recorder: {
      recorder_client_id: clientID,
      description: 'Mocha',
    },
  };

  describe('Valid Requests', function() {
    var res = null;

    before(function() {
      return call(params)
        .then(function(r) {
          res = r;
        });
    });

    it('should return a 201 status code', function() {
      expect(res.statusCode).to.equal(201);
    });

    it('should return a full representation of the Recorder resource.', function() {
      expect(res.body).to.have.property('at');
      expect(res.body).to.have.property('recorder');
      expect(res.body.recorder).to.have.property('recorder_client_id', clientID);
      expect(res.body.recorder).to.have.property('description', 'Mocha');
    });
  });

  describe('Invalid Input Data', function() {
    describe('wihtout api_key', function() {
      it('should return a 400 error.', function() {
        return call(_.omit(params, 'api_key'))
          .then(function(res) {
            expect(res).to.have.property('statusCode', 400);
            expect(res.body).to.have.property('errorMessage');
            expect(res.body.errorMessage).to.match(/Bad Request/);
            expect(res.body.errorMessage).to.match(/api_key/);
          });
      });
    });

    describe('without recorder', function() {
      it('should return a 400 error.', function() {
        return call(_.omit(params, 'recorder'))
          .then(function(res) {
            expect(res).to.have.property('statusCode', 400);
            expect(res.body).to.have.property('errorMessage');
            expect(res.body.errorMessage).to.match(/Bad Request/);
            expect(res.body.errorMessage).to.match(/recorder/);
          });
      });
    });

    describe('without recorder_client_id', function() {
      it('should return a 400 error.', function() {
        return call({
          api_key: API_KEY,
          recorder: {
            description: 'Mocha',
          },
        }).then(function(res) {
          expect(res).to.have.property('statusCode', 400);
          expect(res.body.errorMessage).to.match(/Bad Request/);
          expect(res.body.errorMessage).to.match(/recorder_client_id/);
        });
      });
    });
  });

  //client provides an api_key but there's no record of it in the database
  describe('Invalid API Key', function() {
    it('should return a 401 error.', function() {
      return call({
        api_key: 'apifake',
        recorder: {
          recorder_client_id: _.token(12),
        },
      }).then(function(res) {
        expect(res.statusCode).to.equal(401);
        expect(res.body.errorMessage).to.match(/Unauthorized/);
        expect(res.body.errorMessage).to.match(/api_key/);
      });
    });
  });

  describe('Already Registered', function() {
    var params = {
      api_key: API_KEY,
      recorder: {
        recorder_client_id: _.token(12),
      },
    };

    before(function() {
      return call(params);
    });

    it('should return a 409 error.', function() {
      return call(params).then(function(res) {
        expect(res.statusCode).to.equal(409);
        expect(res.body.errorMessage).to.match(/Conflict.*recorder_client_id/);
      });
    });
  });
});
