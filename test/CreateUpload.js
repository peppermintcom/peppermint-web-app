var fs = require('fs');
var expect = require('chai').expect;
var request = require('request');
var _ = require('utils');

const RECORDER_URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/recorder';
const UPLOAD_URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/uploads';
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

describe('POST /uploads', function() {
  var jwt = null;
  var recorder = null;

  before(function() {
    return post(RECORDER_URL, {
      api_key: API_KEY,
      recorder: {
        recorder_client_id: _.token(12),
      },
    }).then(function(res) {
      jwt = res.body.at;
      recorder = res.body.recorder;
    });
  });

  describe('Valid Requests', function() {
    it('should generate a signed_url', function(done) {
      post(UPLOAD_URL, {
          content_type: 'audio/x-aac',
        }, {
          'Authorization': 'Bearer ' + jwt,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(201);
          expect(res.body).to.have.property('signed_url');

          fs.readFile('test/sample.aac', function(err, data) {
            if (err) {
              done(err);
              return;
            }
            request.put({
              url: res.body.signed_url,
              body: data,
              headers: {
                'Content-Type': 'audio/x-aac',
                'Content-Length': '484307',
              },
            }, function(err, s3resp) {
              if (err) {
                done(err);
                return;
              }
              expect(s3resp.statusCode).to.equal(200);
              done();
            });
          });
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  describe('Invalid Requests', function() {
    describe('Missing content_type in payload', function() {
      it('should return a 400 error', function() {
        return post(UPLOAD_URL, {}, {
          Authorization: 'Bearer ' + jwt,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body.errorMessage).to.match(/Bad Request.*content_type/);
        });
      });
    });
  });

  describe('Unauthorized', function() {
    describe('Missing Authorization header', function() {
      it('should return a 401 error', function() {
        return post(UPLOAD_URL, {
            content_type: 'audio/x-aac',
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.body.errorMessage).to.match(/Unauthorized/);
          });
      });
    });

    describe('Malformed Authorization header', function() {
      it('should return a 401 error', function() {
        return post(UPLOAD_URL, {
          content_type: 'audio/aac',
        }, {
          Authorization: jwt,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/Unauthorized/);
        });
      });
    });

    describe('Tampered JWT', function() {
      it('should return a 401 error', function() {
        return post(UPLOAD_URL, {
          content_type: 'audio/aac',
        }, {
          Authorization: 'Bearer ' + jwt + 'x',
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body.errorMessage).to.match(/Unauthorized/);
        });
      })
    });
  });
});
