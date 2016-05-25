import {expect} from 'chai'
import tv4 from 'tv4'
import defs from '../../definitions'
import {SignIn} from '../bundle.js'
import domain from '../../domain'
import fixtures from '../../procedures/test/fixtures'
import accounts from '../../repository/accounts'
import recorders from '../../repository/recorders'
import jwts from '../../utils/jwt'
import token from '../../utils/randomtoken'
import {peppermintScheme} from '../../utils/test'
import * as spec from '../../resources/jwts/post/spec'

const GOOGLE = 1;
const FACEBOOK = 2;

describe.only('lambda:SignIn', function() {
  describe('no include param', function() {

    describe('missing Authorization header', function() {
      it('should fail with a Bad Request error.', function(done) {
        SignIn({
          api_key: fixtures.API_KEY,
        }, null, function(err, result) {
          expect(err).to.have.property('message', '401')
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header required')
          done()
        })
      })
    })

    describe('unparseable Authorization headers', function() {
      it('should fail with a Bad Request error.', function(done) {
        SignIn({
          Authorization: 'Peppermint recorder=',
          api_key: fixtures.API_KEY,
        }, null, function(err, result) {
          expect(err).to.have.property('message', '400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header does not follow Peppermint scheme');
          done();
        })
      })
    })

    describe('unregistered account', function() {
      it('should fail with a Not Found error.', function(done) {
        SignIn({
          Authorization: peppermintScheme(null, null, 'xxxxxx', 'xxxxxxxx'),
          api_key: fixtures.API_KEY,
        }, null, function(err, result) {
          expect(err).to.have.property('message', '404');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Account not found.');
          done();
        })
      })

      describe('with registered recorder', function() {
        it('should fail with a Not Found error.', function(done) {
          fixtures.recorder().then(function(results) {
            let recorder = results[0]
            let key = results[1]

            SignIn({
              Authorization: peppermintScheme(recorder.client_id, key, 'xxxxx', 'xxxxxx'),
              api_key: fixtures.API_KEY,
            }, null, function(err, result) {
              expect(err).to.have.property('message', '404');
              expect(JSON.parse(err.name)).to.have.property('detail', 'Account not found.');
              done();
            })
          })
        })
      })
    })

    describe('unregistered recorder', function() {
      it('should fail with a Not Found error.', function(done) {
        SignIn({
          Authorization: peppermintScheme('xxxxxxxxx', 'xxxxxxxxx'),
          api_key: fixtures.API_KEY,
        }, null, function(err, result) {
          try {
            expect(result).not.to.be.ok
            expect(err).to.have.property('message', '404')
            expect(JSON.parse(err.name)).to.have.property('detail', 'Recorder not found.');
          } catch(e) {
            return done(e)
          }
          done()
        })
      })

      describe('with valid account credentials', function() {
        it('should fail with a Not Found error.', function(done) {
          fixtures.account().then(function(result) {
            let account = result[0]
            let password = result[1]

            SignIn({
              Authorization: peppermintScheme('xxxxx', 'xxxxxxx', account.email, password),
              api_key: fixtures.API_KEY,
            }, null, function(err, result) {
              try {
                expect(result).not.to.be.ok
                expect(err).to.have.property('message', '404')
                expect(JSON.parse(err.name)).to.have.property('detail', 'Recorder not found.')
              } catch(e) {
                return done(e)
              }
              done()
            })
          })
        })
      })
    })

    describe('account credentials', function() {
      it('should succeed.',  function(done) {
        fixtures.account().then(function(results) {
          let account = results[0]
          let password = results[1]

          SignIn({
            Authorization: peppermintScheme(null, null, account.email, password),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {
            try {
              expect(res.data.relationships).not.to.have.property('recorder')
              expect(res.data.relationships).to.have.property('account')
              expect(res.data.relationships.account.data.id).to.equal(account.account_id)
              expect(res.included).to.have.length(1)
            } catch(e) {
              return done(e)
            }
            if (!tv4.validate(res.included[0], defs.accounts.schema)) {
              return done(tv4.error);
            }
            if (!tv4.validate(res, spec.responses['200'])) {
              return done(tv4.error)
            }
            done()
          })
        })
      })

      describe('wrong password', function() {
        it('should fail with an Unauthorized error.', function(done) {
          fixtures.account().then(function(results) {
            let account = results[0]
            let password = results[1]

            SignIn({
              Authorization: peppermintScheme(null, null, account.email, 'x' + password),
              api_key: fixtures.API_KEY,
            }, null, function(err, res) {
              try {
                expect(res).not.to.be.ok
                expect(err).to.have.property('message', '401')
                expect(JSON.parse(err.name)).to.have.property('detail', 'Account password is incorrect.')
              } catch(e) {
                return done(e)
              }
              done()
            })
          })
        })
      })
    })

    describe('recorder credentials', function() {
      it('should succeed.', function(done) {
        let gcmToken = token(64)
        let recorder, key

        fixtures.recorder().then(function(result) {
          recorder = result[0]
          key = result[1]

          return recorders.updateGCMToken(recorder.client_id, gcmToken)
        })
        .then(function(r) {
          SignIn({
            Authorization: peppermintScheme(recorder.client_id, key),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {
            if (err) {
              return done(err)
            }
            if (!tv4.validate(res, spec.responses['200'])) {
              throw tv4.error
            }
            expect(res.data.relationships).not.to.have.property('account');
            expect(res.data.relationships).to.have.property('recorder');
            expect(res.data.relationships.recorder.data.id).to.equal(recorder.recorder_id);
            expect(res.included).to.have.length(1);
            if (!tv4.validate(res.included[0], defs.recorders.schemaNoKey)) {
              console.log(tv4.error)
              return done(tv4.error);
            }
            done();
          })
        })
        .catch(done)
      })

      describe('wrong key', function() {
        it('should fail with an Unauthorized error.', function(done) {
          fixtures.recorder().then(function(result) {
            let recorder = result[0]
            let key = result[1]
            
            SignIn({
              Authorization: peppermintScheme(recorder.client_id, 'x' + key),
              api_key: fixtures.API_KEY,
            }, null, function(err, res) {
              try {
                expect(res).not.to.be.ok
                expect(err).to.have.property('message')
                expect(JSON.parse(err.name)).to.have.property('detail', 'Recorder key is incorrect.')
              } catch(e) {
                done(e)
              }
              done()
            })
          })
        })
      })
    })

    describe('dual recorder-account credentials', function() {
      describe('no receiver link', function() {
        it('should return jwt and recorder and account entities.', function(done) {
          Promise.all([
            fixtures.recorder(),
            fixtures.account(),
          ])
          .then(function(results) {
            let recorder = results[0][0]
            let key = results[0][1]
            let account = results[1][0]
            let password = results[1][1]

            SignIn({
              Authorization: peppermintScheme(recorder.client_id, key, account.email, password),
              api_key: fixtures.API_KEY,
            }, null, function(err, result) {
              if (err) return done(err)

              expect(result.data.relationships).to.have.property('recorder');
              expect(result.data.relationships).to.have.property('account');
              expect(result.data.relationships.recorder.data.id).to.equal(recorder.recorder_id);
              expect(result.data.relationships.account.data.id).to.equal(account.account_id);
              expect(result.included).to.have.length(2);
              done(tv4.validate(result, spec.responses['200']) ? null : tv4.error);
            })
          })
          .catch(done)
        })
      })
 
      describe('linked as receiver', function() {
        it('should include receiver relationship on included account entity.', function(done) {
          Promise.all([
            fixtures.recorder(),
            fixtures.account(),
          ])
          .then(function(results) {
            let recorder = results[0][0]
            let key = results[0][1]
            let account = results[1][0]
            let password = results[1][1]

            return accounts.link(recorder.recorder_id, account.account_id)
            .then(function() {
              SignIn({
                Authorization: peppermintScheme(recorder.client_id, key, account.email, password),
                api_key: fixtures.API_KEY,
              }, null, function(err, result) {
                if (err) return done(err)
                let _account = result.included.find(function(resource) {
                  return resource.type === 'accounts'
                })
                let _recorder = result.included.find(function(resource) {
                  return resource.type === 'recorders'
                })
                expect(_account.relationships).to.deep.equal({
                  receivers: {data: [{type: 'recorders', id: recorder.recorder_id}]},
                });
                expect(_recorder.id).to.equal(recorder.recorder_id)
                expect(_account.id).to.equal(account.account_id)
                done();
              })
            })
          })
          .catch(done)
        })
      })

      describe('incorrect key', function() {
        it('should fail with an Unauthorized error.', function(done) {
          Promise.all([
            fixtures.recorder(),
            fixtures.account(),
          ])
          .then(function(results) {
            let recorder = results[0][0]
            let key = results[0][1]
            let account = results[1][0]
            let password = results[1][1]

            SignIn({
              Authorization: peppermintScheme(recorder.client_id, 'x' + key, account.email, password),
              api_key: fixtures.API_KEY,
            }, null, function(err, res) {
              try {
                expect(res).not.to.be.ok
                expect(err).to.have.property('message', '401')
                expect(JSON.parse(err.name)).to.have.property('detail', 'Recorder key is incorrect.')
              } catch(e) {
                return done(e)
              }
              done()
            })
          })
        })
      })

      describe('inccorrect password', function() {
        it('should fail with an Unauthorized error.', function(done) {
          Promise.all([
            fixtures.recorder(),
            fixtures.account(),
          ])
          .then(function(results) {
            let recorder = results[0][0]
            let key = results[0][1]
            let account = results[1][0]
            let password = results[1][1]

            SignIn({
              Authorization: peppermintScheme(recorder.client_id, key, account.email, 'x' + password),
              api_key: fixtures.API_KEY,
            }, null, function(err, res) {
              try {
                expect(res).not.to.be.ok
                expect(err).to.have.property('message', '401')
                expect(JSON.parse(err.name)).to.have.property('detail', 'Account password is incorrect.')
              } catch(e) {
                return done(e)
              }
              done()
            })
          })
        })
      })
    })

    describe('goole', function() {
      var email = 'andrew@areed.io';
      var name = 'Andrew Reed';
      //https://developers.google.com/oauthplayground/
      var accessToken = process.env.GOOGLE_AT;

      describe('account does not exist', function() {
        before(function() {
          return accounts.delete(email)
        })

        it('should return a jwt and new account.', function(done) {
          SignIn({
            Authorization: peppermintScheme(null, null, email, accessToken, GOOGLE),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {

            if (err) return done(err)

            if (!tv4.validate(res, spec.responses['200'])) {
              throw tv4.error
            }

            //main resource is a jwt
            let jwt = jwts.verify(res.data.attributes.token)
            expect(jwt).to.have.property('account_id')

            //account is included
            if (!tv4.validate(res.included[0], defs.accounts.schema)) {
              throw tv4.error
            }
            expect(res.included[0].id).to.equal(res.data.relationships.account.data.id)
            done()
          })
        })
      })

      describe('account exists', function() {
        let account

        before(function() {
          return accounts.upsert(domain.newAccount({
            email: email,
            full_name: name,
            verification_source: 'Mocha',
          }))
          .then(function(_account) {
            account = _account
          })
        })

        it('should return a jwt and the existing account.', function(done) {
          SignIn({
            Authorization: peppermintScheme(null, null, email, accessToken, GOOGLE),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {
            if (err) return done(err)

            if (!tv4.validate(res, spec.responses['200'])) {
              throw tv4.error
            }

            let includedAccount = res.included[0];

            if (!tv4.validate(includedAccount, defs.accounts.schema)) {
              throw tv4.error;
            }
            expect(includedAccount.id).to.equal(account.account_id);
            expect(includedAccount.attributes).to.have.property('email', account.email);
            done()
          })
        })
      })

      describe('invalid access token', function() {
        it('should fail with a 400 error.', function(done) {
          SignIn({
            Authorization: peppermintScheme(null, null, email, 'x' + accessToken, GOOGLE),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {
            if (!err) done(new Error('success with bad access token'))

            try {
              expect(err).to.have.property('message', '401')
              expect(JSON.parse(err.name)).to.deep.equal({
                detail: 'Google rejected access token',
              })
            } catch(e) {done(e)}
            done()
          })
        })
      })
    })

    describe('facebook', function() {
      var email = 'andrew@areed.io';
      var name = 'Andrew Reed';
      //https://developers.facebook.com/tools/explorer/
      var accessToken = process.env.FACEBOOK_AT;

      describe('account does not exist', function() {
        before(function() {
          return accounts.delete(email)
        });

        it('should return a jwt and new account.', function(done) {
          SignIn({
            Authorization: peppermintScheme(null, null, email, accessToken, FACEBOOK),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {

            if (err) return done(err)

            if (!tv4.validate(res, spec.responses['200'])) {
              throw tv4.error;
            }

            //main resource is a jwt
            let jwt = jwts.verify(res.data.attributes.token);
            expect(jwt).to.have.property('account_id');

            //account is included
            if (!tv4.validate(res.included[0], defs.accounts.schema)) {
              throw tv4.error;
            }
            expect(res.included[0].id).to.equal(res.data.relationships.account.data.id);
            done()
          })
        });
      });

      describe('account exists', function() {
        let account

        before(function() {
          return accounts.upsert(domain.newAccount({
            email: email,
            full_name: name,
            verification_source: 'Mocha',
          }))
          .then(function(_account) {
            account = _account
          })
        })

        it('should return a jwt and the existing account.', function(done) {
          SignIn({
            Authorization: peppermintScheme(null, null, email, accessToken, FACEBOOK),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {
            if (err) return done(err)

            if (!tv4.validate(res, spec.responses['200'])) {
              throw tv4.error
            }

            let includedAccount = res.included[0];

            if (!tv4.validate(includedAccount, defs.accounts.schema)) {
              throw tv4.error;
            }
            expect(includedAccount.id).to.equal(account.account_id);
            expect(includedAccount.attributes).to.have.property('email', account.email);
            done()
          })
        })
      });

      describe('invalid access token', function() {
        it('should fail with a 400 error.', function(done) {
          SignIn({
            Authorization: peppermintScheme(null, null, email, 'x' + accessToken, FACEBOOK),
            api_key: fixtures.API_KEY,
          }, null, function(err, res) {
            if (!err) done(new Error('success with bad access token'))

            try {
              expect(err).to.have.property('message', '401')
              expect(JSON.parse(err.name)).to.deep.equal({
                detail: 'Facebook rejected access token',
              })
            } catch(e) {done(e)}
            done()
          })
        })
      })
    })
  })
})
