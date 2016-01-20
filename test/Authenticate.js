var tv4 = require('tv4');
var expect = require('chai').expect;
var _ = require('utils/test');
var post = _.partial(_.http, 'POST', '/jwts', null);
var jsonapischema = require('./jsonapischema.json');

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
            if (!tv4.validate(jsonapischema, res.body)) {
              throw tv4.error;
            }
            expect(res.body.data.attributes).to.have.property('token');
            expect(res.body.data.relationships).to.deep.equal({
              recorder: {type: 'recorders', id: recorder.recorder_id},
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
            if (!tv4.validate(jsonapischema, res.body)) {
              throw tv4.error;
            }
            expect(res.body.data.attributes).to.have.property('token');
            expect(res.body.data.relationships).to.deep.equal({
              account: {type: 'accounts', id: account.account_id},
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
            if (!tv4.validate(jsonapischema, res.body)) {
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
