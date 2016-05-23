//@flow
import {expect} from 'chai'
import fake from '../../../domain/fake'
import authenticate, {Errors} from '../authenticate'
import registerRecorder from '../registerRecorder'
import registerAccount from '../registerAccount'

describe('authenticate command', function() {
  describe('recorder only', function() {
    describe('correct key', function() {
      it('should succeed.', function() {
        return registerRecorder({
          api_key: fake.API_KEY,
          client_id: null,
          recorder_key: null,
          description: null,
        })
        .then(function(res) {
          return authenticate({
            recorder: {
              user: res.recorder.client_id,
              password: res.recorder_key,
            },
          })
          .then(function(res) {
            expect(res.access_token).to.be.ok;
            expect(res.account).to.equal(null);
            expect(res.recorder).to.be.ok;
            expect(res.recorder).to.have.property('recorder_id');
            expect(res.recorder).not.to.have.property('recorder_key_hash');
          });
        });
      });
    });

    describe('incorrect key', function() {
      it('should fail with Errors.WrongRecorderKey.', function() {
        return registerRecorder({
          api_key: fake.API_KEY,
          client_id: null,
          recorder_key: null,
          description: null,
        })
        .then(function(res) {
          return authenticate({
            recorder: {
              user: res.recorder.client_id,
              password: 'wrong recorder key',
            },
          });
        })
        .then(function() {
          throw new Error('success with wrong recorder key');
        })
        .catch(function(err) {
          expect(err).to.equal(Errors.WrongRecorderKey);
        });
      });
    });
  });

  describe('account only', function() {
    describe('correct password', function() {
      it('should succeed.', function() {
        let password = fake.secret()

        return registerAccount({
          email: fake.email(),
          full_name: fake.name(),
          password: password,
        })
        .then(function(res) {
          if (!res.account.email) throw new Error('expect account to have email');

          return authenticate({
            account: {
              user: res.account.email,
              password: password,
            },
          });
        })
        .then(function(res) {
          expect(res).to.have.property('access_token')
          expect(res).to.have.property('recorder', null)
          expect(res).to.have.property('account');
          expect(res.account).to.have.property('email');
          expect(res.account).to.have.property('full_name');
          expect(res.account).to.have.property('account_id');
          expect(res.account).to.have.property('registered');
        });
      });
    });

    describe('incorrect password', function() {
      it('should fail with Errors.WrongAccountPassword.', function() {
        let email = fake.email()

        return registerAccount({
          email: email,
          full_name: fake.name(),
          password: fake.secret(),
        })
        .then(function() {
          return authenticate({
            account: {
              user: email,
              password: fake.secret(),
            },
          });
        })
        .then(function() {
          throw new Error('success with incorrect password')
        })
        .catch(function(err) {
          expect(err).to.equal(Errors.WrongAccountPassword)
        })
      });
    });
  });

  describe('google only', function() {
    describe('valid access token', function() {
      it('should succeed with an account.', function() {
      });

      describe('existing, unverified account', function() {
        it('should set the verified and verification_source attributes on the account.', function() {
        });
      });
    });

    describe('invalid access token', function() {
      it('should fail with Errors.ProviderAccessTokenRejected', function() {
      });
    });
  });

  describe('facebook only', function() {
    describe('valid access token', function() {
      it('should succeed.', function() {
      });

      describe('existing, unverified account', function() {
        it('should set the verified and verification_source attributes on the account.', function() {
        });
      });
    });

    describe('invalid access token', function() {
      it('should fail with Errors.ProviderAccessTokenRejected', function() {
      });
    });
  });

  describe('recorder+account', function() {
    describe('valid recorder key, valid account password', function() {
      it('should succeed.', function() {
      });
    });

    describe('valid recorder key, invalid account password', function() {
      it('should fail with Errors.WrongAccountPassword.', function() {
      });
    });

    describe('invalid recorder key, valid account password', function() {
      it('should fail with Errors.WrongRecorderKey.', function() {
      });
    });

    describe('invalid recorder key, invalid account password', function() {
      it('should fail with Errors.WrongRecorderKey or Errors.WrongAccountPassword.', function() {
      });
    });
  });

  describe('recorder+google', function() {
    describe('valid recorder key, valid google access token', function() {
      it('should succeed.', function() {
      });
    });

    describe('valid recorder key, invalid google access token', function() {
      it('should fail with Errors.ProviderRejectedAccessToken.', function() {
      });
    });

    describe('invalid recorder key, valid google access token', function() {
      it('should fail with Errors.WrongRecorderKey.', function() {
      });
    });

    describe('invalid recorder key, invalid google access token', function() {
      it('should fail with Errors.WrongRecorderKey or Errors.ProviderAccessTokenRejected.', function() {
      });
    });
  });

  describe('recorder+facebook', function() {
    describe('valid recorder key, valid facebook access token', function() {
      it('should succeed.', function() {
      });
    });

    describe('valid recorder key, invalid facebook access token', function() {
      it('should fail with Errors.ProviderAccessTokenRejected.', function() {
      });
    });

    describe('invalid recorder key, valid facebook access token', function() {
      it('should fail with Errors.WrongRecorderKey.', function() {
      });
    });

    describe('invalid recorder key, invalid facebook access token', function() {
      it('should fail with Errors.WrongRecorderKey or Errors.ProviderAccessTokenRejected', function() {
      });
    });
  });

  describe('account+google', function() {
    it('should fail with Errors.MultipleAccountStrategies.', function() {
    });

    describe('+recorder', function() {
      it('should fail with Errors.MultipleAccountStrategies.', function() {
      });
    });
  });

  describe('account+facebook', function() {
    it('should fail with Errors.MultipleAccountStrategies.', function() {
    });

    describe('+recorder', function() {
      it('should fail with Errors.MultipleAccountStrategies.', function() {
      });
    });
  });

  describe('google+facebook', function() {
    it('should fail wtih Errors.MultipleAccountStrategies.', function() {
    });

    describe('+recorder', function() {
      it('should fail with Errors.MultipleAccountStrategies.', function() {
      });
    });
  });
});
