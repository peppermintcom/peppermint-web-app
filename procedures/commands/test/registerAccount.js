//@flow
import {expect} from 'chai'
import fixtures from '../../../repository/dynamo/test/fixtures'
import fake from '../../../domain/fake'
import registerAccount, {Errors} from '../registerAccount'

describe('registerAccount command', function() {
  it('should return a new account and access token', function() {
    let email = fake.email()
    let name = fake.name()

    return registerAccount({
      email: email,
      full_name: name,
      password: fake.secret(),
    })
    .then(function(res) {
      expect(res).to.have.property('access_token');
      expect(res).to.have.property('account');
      expect(res.account).to.have.property('account_id');
      expect(res.account).to.have.property('email', email.toLowerCase());
      expect(res.account).to.have.property('full_name', name);
      expect(res.account).to.have.property('registered');
      expect(res.account).to.have.property('verified', null);
      expect(res.account).to.have.property('verification_source', null);
      expect(res.account).not.to.have.property('password');
      expect(res.account).not.to.have.property('pass_hash');
    });
  });

  describe('account already exists with same email', function() {
    it('should fail with Errors.Conflict.', function() {
      return fixtures.account()
      .then(function(account) {
        if (!account.email) throw new Error('expected account fixture to have an email');

        return registerAccount({
          email: account.email,
          full_name: fake.name(),
          password: fake.secret(),
        });
      })
      .then(function() {
        throw new Error('success with duplicate email');
      })
      .catch(function(err) {
        expect(err).to.equal(Errors.Conflict);
      });
    });
  });
});
