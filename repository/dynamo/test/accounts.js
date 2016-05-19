//@flow
import {expect} from 'chai'
import domain from '../../domain'
import accounts from '../accounts'
import fixtures from './fixtures'

describe('accounts', function() {
  describe('save', function() {
    it('should save an Account in dynamo.', function() {
      var a = domain.newAccount({
        email: 'bob@example.com',
        full_name: 'Bob Smith',
        pass_hash: 'secret',
        verification_source: '127.0.0.1',
      });

      return accounts.save(a)
        .then(function(_a) {
          expect(_a).to.equal(a);
        });
    });
  });

  describe('read', function() {
    it('should restore a saved Account from dynamo.', function() {
      return fixtures.account('127.0.0.1')
        .then(function(account) {
          return accounts.read(account.email)
            .then(function(_a) {
              expect(_a).to.deep.equal(account);
            });
        });
    });
  });

  describe('readByID', function() {
    it('should restore a saved Account from dyanmo.', function() {
      return fixtures.account('google')
        .then(function(account) {
          return accounts.readByID(account.account_id)
            .then(function(_a) {
              expect(_a).to.deep.equal(account)
            })
        })
    })
  })

  describe('setHighwater', function() {
    describe('new value precedes current', function() {
      it('should leave the existing highwater timestamp on the account item.', function() {
        let ts = Date.now() - 1
        let account
   
        return fixtures.account()
          .then(function(_account) {
            account = _account

            return accounts.setHighwater(account.email, ts)
          })
          .then(function() {
            return accounts.read(account.email);
          })
          .then(function(_account) {
            expect(_account).to.have.property('highwater', account.highwater)
          })
      })
    })

    describe('new value is later than current', function() {
      it('should save the new highwater timestamp to the account item.', function() {
        let ts = Date.now() + 1000
        let account

        return fixtures.account()
          .then(function(_account) {
            account = _account

            return accounts.setHighwater(account.email, ts)
          })
          .then(function() {
            return accounts.read(account.email);
          })
          .then(function(account) {
            expect(account).to.have.property('highwater', ts)
          })
      })
    })

    describe('new value is same as current', function() {
      it('should leave the existing highwater timestamp on the account item.', function() {
        let account

        return fixtures.account()
          .then(function(_account) {
            account = _account

            return accounts.setHighwater(account.email, account.highwater)
          })
          .then(function() {
            return accounts.read(account.email)
          })
          .then(function(_account) {
            expect(_account).to.have.property('highwater', account.highwater)
          })
      })
    })

    describe('no current value', function() {
      it('should save the new highwater timestamp to the account item.', function() {
        let ts = Date.now()
        let account

        return fixtures.account()
          .then(function(_account) {
            account = _account

            delete account.highwater
            return accounts.save(account)
          })
          .then(function() {
            return accounts.setHighwater(account.email, ts)
          })
          .then(function() {
            return accounts.read(account.email)
          })
          .then(function(_account) {
            expect(_account).to.have.property('highwater', ts)
          })
      })
    })
  })
});
