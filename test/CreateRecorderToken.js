var fs = require('fs');
var url = require('url');
var expect = require('chai').expect;
var request = require('request');
var _ = require('utils');

const RECORDER_URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/recorder';
const RECORDER_TOKEN_URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/recorder-token';
const API_KEY = 'abc123';

function post(url, body, headers) {
  return new Promise(function(resolve, reject) {
    request({
      url: url,
      method: 'POST',
      json: true,
      body: body,
      headers: headers,
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

describe('POST /recorder-token', function() {
  var clientID = 'UoZU5kTfnETz';
  var key = '_tBqwNfVJI7-h86VOdhd0BvglTBRCJeuE3L4hDs3';
  var header = 'Basic VW9aVTVrVGZuRVR6Ol90QnF3TmZWSkk3LWg4NlZPZGhkMEJ2Z2xUQlJDSmV1RTNMNGhEczM=';

  before(function() {
    return post(RECORDER_URL, {
      api_key: API_KEY,
      recorder: {
        recorder_client_id: clientID,
        recorder_key: key,
      },
    });
  });

  describe('Valid Requests', function() {
    var res = null;

    before(function() {
      return post(RECORDER_TOKEN_URL, {}, {
        Authorization: header,
      })
      .then(function(_res) {
        res = _res;
      });
    });

    it('should return a 201 response', function() {
      expect(res.statusCode).to.equal(201);
      console.log(res.body);
      expect(res.body).to.have.property('at');
      expect(res.body).to.have.property('recorder');
    });
  });

  describe('Unauthorized', function() {
    describe('Missing Authorization header', function() {
      it('should return a 401 error', function() {
        return post(RECORDER_TOKEN_URL, {})
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/Unauthorized/);
        });
      });
    });

    describe('Malformed Authorization header', function() {
      it('should return a 401 error', function() {
        return post(RECORDER_TOKEN_URL, {}, {
          Authorization: 'Basic ' + header,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/Unauthorized/);
        });
      });
    });

    describe.only('Unknown client_id', function() {
      it('should return a 401 error', function() {
        return post(RECORDER_TOKEN_URL, {}, {
          Authorization: 'Basic ' + new Buffer(clientID + 'x:' + key).toString('base64'),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/Unauthorized/);
        });
      });
    });
  });
});
