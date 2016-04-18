//@flow
import {expect} from 'chai'
import fake from '../fake'
import accounts from '../accounts'

describe('repository accounts', function() {
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
