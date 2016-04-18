//@flow
import {expect} from 'chai'
import {newAccount} from '../../domain'
import {save, read} from '../accounts'

describe('accounts', function() {
  describe('save', function() {
    it('should save an Account in dynamo.', function() {
      var a = newAccount({
        email: 'bob@example.com',
        full_name: 'Bob Smith',
        pass_hash: 'secret',
        verification_source: '127.0.0.1',
      });

      return save(a)
        .then(function(_a) {
          expect(_a).to.equal(a);
        });
    });
  });
});
