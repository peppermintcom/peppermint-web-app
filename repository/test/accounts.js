import {expect} from 'chai'
import fake from '../../domain/fake'
import fixtures from '../fixtures'
import accounts from '../accounts'

describe('repository accounts', function() {
  describe('isReceiver', function() {
    describe('false', function() {
      it('should return false.', function() {
        return Promise.all([
          fixtures.account(),
          fixtures.recorder()
        ])
        .then(function(results) {
          let account = results[0]
          let recorder = results[1]

          return accounts.isReceiver(account.account_id, recorder.recorder_id)
        })
        .then(function(is) {
          expect(is).to.equal(false)
        })
      })
    })

    describe('true', function() {
      it('should return true.', function() {
        return Promise.all([
          fixtures.account(),
          fixtures.recorder()
        ])
        .then(function(results) {
          let account = results[0]
          let recorder = results[1]

          return accounts.link(recorder.recorder_id, account.account_id)
        })
        .then(function(receiver) {
          return accounts.isReceiver(receiver.account_id, receiver.recorder_id)
        })
        .then(function(is) {
          expect(is).to.equal(true)
        })
      })
    })
  })

  describe('upsert', function() {
    describe('account does not exist', function() {
      it('should save and return the account argument.', function() {
        let a = fake.account();

        return accounts.upsert(a)
          .then(function(account) {
            expect(account).to.equal(a);

            //will throw ErrNotFound if the account was not saved
            return accounts.read(a.email);
          });
      });
    });

    describe('account exists with same data', function() {
      describe('both have verified timestamp and verification_source set', function() {
        it('should return the account.', function() {
          return accounts.save(fake.account('google'))
            .then(function(a) {
              return accounts.upsert(a)
                .then(function(account) {
                  expect(account).to.deep.equal(a);
                });
            });
        });
      });

      describe('neither have verified timestamp or verification_source set', function() {
        it('should return the account.', function() {
          return accounts.save(fake.account())
            .then(function(a) {
              return accounts.upsert(a)
                .then(function(account) {
                  expect(account).to.deep.equal(a);
                });
            });
        });
      });
    });

    describe('account exists with more data', function() {
      it('should return the account.', function() {
        return accounts.save(fake.account('facebook'))
          .then(function(a) {
            delete a.verified;
            delete a.verification_source;

            return accounts.upsert(a)
              .then(function(account) {
                expect(account).to.have.property('verified');
                expect(account).to.have.property('verification_source');
              });
          });
      });
    });

    describe('account exists with less data', function() {
      it('should update the account.', function() {
        let a = fake.account('127.0.0.1');
        let {verified, verification_source} = a;

        delete a.verified;
        delete a.verification_source;

        return accounts.save(a)
          .then(function(a) {
            a.verified = verified;
            a.verification_source = verification_source;

            return accounts.upsert(a)
              .then(function(account) {
                expect(account).to.have.property('verified', verified);
                expect(account).to.have.property('verification_source', verification_source);
              });
          });
      });
    });
  });
});
