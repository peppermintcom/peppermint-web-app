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
});
