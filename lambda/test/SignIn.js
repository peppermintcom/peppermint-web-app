import {expect} from 'chai'
import tv4 from 'tv4'
import defs from '../../definitions'
import {SignIn} from '../bundle.js'
import domain from '../../domain'
import fixtures from '../../repository/fixtures'
import accounts from '../../repository/accounts'
import jwts from '../../utils/jwt'
import {peppermintScheme} from '../../utils/test'
import * as spec from '../../resources/jwts/post/spec'

const GOOGLE = 1;
const FACEBOOK = 2;

describe('lambda:SignIn', function() {
  describe('no include param', function() {

    describe.only('goole', function() {
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
