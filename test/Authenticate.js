var util = require('util');
var tv4 = require('tv4');
var expect = require('chai').expect;
var _ = require('utils/test');
var post = _.partial(_.http, 'POST', '/jwts', null);
var jsonapischema = require('./jsonapischema.json');
var spec = require('../resources/jwts/post/spec');
var defs = require('definitions');

const GOOGLE = 1;
const FACEBOOK = 2;

describe('POST /jwts', function() {
  var recorder, account;
  var recorderUser, recorderPass, accountUser, accountPass;

  before(function() {
    return Promise.all([
      _.fake.recorder(),
      _.fake.account(),
    ]).then(function(results) {
      recorder = results[0].recorder;
      account = results[1];
      recorderUser = recorder.recorder_client_id;
      recorderPass = recorder.recorder_key;
      accountUser = account.email;
      accountPass = account.password;
    });
  });

  describe('google-only authentication', function() {
    var response;

    var email = 'andrew@areed.io';
    var name = 'Andrew Reed';
    //https://developers.google.com/oauthplayground
    var accessToken = process.env.GOOGLE_AT;
    if (!accessToken) {
      throw new Error('GOOGLE_AT=access_token from oauth playground');
    }

    describe('with invalid access token', function() {
      before(function() {
        var header = _.peppermintScheme(null, null, email, 'X' + accessToken, GOOGLE);
        return post({
          'X-Api-Key': _.fake.API_KEY,
          Authorization: header,
        }).then(function(_response) {
          response = _response;
        });
      });
 
      it('should respond with 401 status code.', function() {
        expect(response.statusCode).to.equal(401);
      });

      it('should respond with valid jsonapi content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, jsonapischema)) {
          throw tv4.error;
        }
      });

      it('should respond with body matching spec documentation.', function() {
        expect(response.body).to.deep.equal({
          errors: [{detail: 'Google rejected access token'}],
        });
        if (!tv4.validate(response.body, spec.responses['401'].schema)) {
          throw tv4.error;
        }
      });
    });

    describe('with Peppermint account', function() {
      var account, response;

      before(function() {
        return _.accounts.upsert({
          email: email,
          name: name,
          source: 'Mocha',
          email_is_verified: true,
        })
        .then(function(_account) {
          account = _account;
        });
      });

      before(function() {
        var header = _.peppermintScheme(null, null, email, accessToken, GOOGLE);
        return post({
          'X-Api-Key': _.fake.API_KEY,
          Authorization: header,
        }).then(function(_response) {
          response = _response;
        });
      });

      it('should respond with status code 200.', function() {
        expect(response.statusCode).to.equal(200);
      });

      it('should respond with jsonapi content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, jsonapischema)) {
          console.log(util.inspect(tv4.error, {depth: null}));
          console.log(util.inspect(response.body));
          throw tv4.error;
        }
      });

      it('should respond with a body matching the spec documentation.', function() {
        if (!tv4.validate(response.body, spec.responses['200'].schema)) {
          throw tv4.error;
        }
      });

      it('should include the account in the response.', function() {
        if (!tv4.validate(response.body.included[0], defs.accounts.schema)) {
          throw tv4.error;
        }
        expect(response.body.included[0].id).to.equal(account.account_id);
      });

      it('should send a jwt valid for the account.', function() {
        return Promise.all([
          jwtAuthenticatesAccount(response.body.data.attributes.token, response.body.included[0].id),
          jwtAuthenticatesRecorder(response.body.data.attributes.token),
        ])
        .then(function(results) {
          must(results[0]);
          mustnt(results[1]);
        });
      });
    });

    describe('without Peppermint account', function() {
      before(function() {
        return _.accounts.del(email);
      });

      before(function() {
        var header = _.peppermintScheme(null, null, email, accessToken, GOOGLE);
        return post({
          'X-Api-Key': _.fake.API_KEY,
          Authorization: header,
        }).then(function(_response) {
          response = _response;
        });
      });

      it('should respond with status code 200.', function() {
        expect(response.statusCode).to.equal(200);
      });

      it('should respond with jsonapi content.', function() {
        expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
        if (!tv4.validate(response.body, jsonapischema)) {
          console.log(util.inspect(tv4.error, {depth: null}));
          console.log(util.inspect(response.body));
          throw tv4.error;
        }
      });

      it('should respond with a body matching the spec documentation.', function() {
        if (!tv4.validate(response.body, spec.responses['200'].schema)) {
          throw tv4.error;
        }
      });

      it('should include the new account in the response.', function() {
        if (!tv4.validate(response.body.included[0], defs.accounts.schema)) {
          throw tv4.error;
        }
      });

      it('should send a jwt valid for the account.', function() {
        return Promise.all([
          jwtAuthenticatesAccount(response.body.data.attributes.token, response.body.included[0].id),
          jwtAuthenticatesRecorder(response.body.data.attributes.token),
        ])
        .then(function(results) {
          must(results[0]);
          mustnt(results[1]);
        });
      });
    });
  });

  describe('recorder-only authentication', function() {
    describe('registered recorder', function() {
      describe('correct recorder key', function() {
        it('should return a jwt.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(recorderUser, recorderPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            expect(res.body.data.attributes).to.have.property('token');
            expect(res.body.data.relationships).to.deep.equal({
              recorder: {data: {type: 'recorders', id: recorder.recorder_id}},
            });
            expect(res.body.included).to.deep.equal([{
              type: 'recorders',
              id: recorder.recorder_id,
              attributes: {
                recorder_client_id: recorder.recorder_client_id,
                recorder_ts: recorder.recorder_ts,
                description: recorder.description,
              },
            }]);

            return Promise.all([
              jwtAuthenticatesRecorder(res.body.data.attributes.token),
              jwtAuthenticatesAccount(res.body.data.attributes.token, account.account_id),
            ]);
          })
          .then(function(results) {
            must(results[0]);
            mustnt(results[1]);
          });
        });
      });

      describe('incorrect recorder key', function() {
        it('should return a 401 error.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(recorderUser, 'x' + recorderPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.body).to.deep.equal({
              errors: [{detail: 'recorder key'}],
            });
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['401'].schema)) {
              throw tv4.error;
            }
          });
        });
      });
    });

    describe('unregistered recorder', function() {
      it('should return a 404 error.', function() {
        return post({
          'X-Api-Key': _.fake.API_KEY,
          Authorization: _.peppermintScheme('x' + recorderUser, recorderPass),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(404);
          expect(res.body).to.deep.equal({
            errors: [{detail: 'Recorder not found'}],
          });
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['404'].schema)) {
            throw tv4.error;
          }
        });
      });
    });
  });

  describe('account-only authentication', function() {
    describe('registered account', function() {
      describe('correct password', function() {
        it('should return a valid JWT.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(null, null, accountUser, accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            expect(res.body.data.attributes).to.have.property('token');
            expect(res.body.data.relationships).to.deep.equal({
              account: {data: {type: 'accounts', id: account.account_id}},
            });
            expect(res.body.included).to.deep.equal([{
              type: 'accounts',
              id: account.account_id,
              attributes: {
                email: account.email.toLowerCase(),
                full_name: account.full_name,
                registration_ts: account.registration_ts,
                is_verified: false,
              },
            }]);

            return Promise.all([
              jwtAuthenticatesAccount(res.body.data.attributes.token, account.account_id),
              jwtAuthenticatesRecorder(res.body.data.attributes.token),
            ]);
          })
          .then(function(results) {
            must(results[0]);
            mustnt(results[1]);
          });
        });
      });

      describe('incorrect password', function() {
        it('should respond with a 401 error.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(null, null, accountUser, 'x' + accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.body).to.deep.equal({
              errors: [{detail: 'account password'}],
            });
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['401'].schema)) {
              throw tv4.error;
            }
          });
        });
      });
    });

    describe('unregistered account', function() {
      it('should respond with a 404 error.', function() {
        return post({
          'X-Api-Key': _.fake.API_KEY,
          Authorization: _.peppermintScheme(null, null, 'x' + accountUser, accountPass),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(404);
          expect(res.body).to.deep.equal({
            errors: [{detail: 'Account not found'}],
          });
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['404'].schema)) {
            throw tv4.error;
          }
        });
      });
    });
  });

  describe('dual account and recorder authentication', function() {
    describe('registered recorder and account', function() {
      describe('correct recorder key and account password', function() {
        it('should return a valid JWT.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(recorderUser, recorderPass, accountUser, accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            expect(res.body.data.attributes).to.have.property('token');
            expect(res.body.data.relationships).to.have.property('recorder'); 
            expect(res.body.data.relationships).to.have.property('account');
            expect(res.body.included).to.have.length(2);

            return Promise.all([
              jwtAuthenticatesAccount(res.body.data.attributes.token, account.account_id),
              jwtAuthenticatesRecorder(res.body.data.attributes.token),
            ]);
          })
          .then(function(results) {
            must(results[0]);
            must(results[1]);
          });
        });
      });

      describe('correct recorder key but incorrect account password', function() {
        it('should 401.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(recorderUser, recorderPass, accountUser, 'x' + accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.body).to.deep.equal({
              errors: [{detail: 'account password'}],
            });
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['401'].schema)) {
              throw tv4.error;
            }
          });
        });
      });

      describe('correct account bassword but incorrect recorder key', function() {
        it('should 401.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(recorderUser, 'x' + recorderPass, accountUser, accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            expect(res.body).to.deep.equal({
              errors: [{detail: 'recorder key'}],
            });
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['401'].schema)) {
              throw tv4.error;
            }
          });
        });
      });

      describe('incorrect recorder key and incorrect account password', function() {
        it('should 401.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(recorderUser, 'x' + recorderPass, accountUser, 'x' + accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(401);
            //detail could be either about recorder key or account password
            expect(res.body.errors[0].detail).to.match(/account password|recorder key/);
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['401'].schema)) {
              throw tv4.error;
            }
          });
        });
      });
    });

    describe('registered recorder but unregistered account', function() {
      describe('correct recorder key', function() {
        it('should 404.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme(recorderUser, recorderPass, 'x' + accountUser, accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(404);
            expect(res.body).to.deep.equal({
              errors: [{detail: 'Account not found'}],
            });
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['404'].schema)) {
              throw tv4.error;
            }
          });
        });
      });
    });

    describe('registered account but unregistered recorder', function() {
      describe('correct account password', function() {
        it('should 404.', function() {
          return post({
            'X-Api-Key': _.fake.API_KEY,
            Authorization: _.peppermintScheme('x' + recorderUser, recorderPass, accountUser, accountPass),
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(404);
            expect(res.body).to.deep.equal({
              errors: [{detail: 'Recorder not found'}],
            });
            expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
            if (!tv4.validate(res.body, jsonapischema)) {
              throw tv4.error;
            }
            if (!tv4.validate(res.body, spec.responses['404'].schema)) {
              throw tv4.error;
            }
          });
        });
      });
    });

    describe('unregistered account and unregistered recorder', function() {
      it('should 404.', function() {
        return post({
          'X-Api-Key': _.fake.API_KEY,
          Authorization: _.peppermintScheme('x' + recorderUser, recorderPass, 'x' + accountUser, accountPass),
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(404);
          expect(res.body.errors[0].detail).to.match(/(Recorder|Account) not found/);
          expect(res.headers).to.have.property('content-type', 'application/vnd.api+json');
          if (!tv4.validate(res.body, jsonapischema)) {
            throw tv4.error;
          }
          if (!tv4.validate(res.body, spec.responses['404'].schema)) {
            throw tv4.error;
          }
        });
      });
    });
  });
});

function must(ok) {
  if (!ok) {
    throw new Error(ok);
  }
}
function mustnt(ok) {
  if (ok) {
    throw new Error(ok);
  }
}

//use a jwt on an endpoint that requires an authenticated recorder to ensure the
//jwt functions as expected.
function jwtAuthenticatesRecorder(jwt) {
  return _.http('POST', '/uploads', {
    content_type: 'audio/mp4',
  }, {
    Authorization: 'Bearer ' + jwt,
  })
  .then(function(res) {
    if (res.statusCode === 201) {
      return true;
    }
    if (res.statusCode === 401) {
      return false;
    }
    throw new Error(res.statusCode);
  });
}

function jwtAuthenticatesAccount(jwt, accountID) {
  return _.http('GET', '/accounts/' + accountID, null, {
    Authorization: 'Bearer ' + jwt,
  })
  .then(function(res) {
    if (res.statusCode === 200) {
      return true;
    }
    if (res.statusCode === 401) {
      return false;
    }
    throw new Error(res.statusCode);
  });
}
