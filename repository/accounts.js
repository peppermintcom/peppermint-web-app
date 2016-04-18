//@flow
import type {Account} from './domain'

import domain from './domain'
import dynamo from './dynamo/accounts'

//upsert inserts the account if it does not exist. If the account does exist but
//is unverified and the argument account is verified, save the verification data
//back to the existing account record. It does not overwrite existing
//attributes.
function upsert (a: Account): Promise<Account> {
  if (!a.email) {
    throw new Error('Email is required');
  }

  return dynamo.read(a.email)
    .then(function(account) {
      //the possible update if the account does exist
      if (a.verified && !account.verified) {
        account.verified = a.verified;
        account.verification_source = a.verification_source;
        return dynamo.save(account);
      }

      //no update or insert
      return account;
    })
    .catch(function(err) {
      if (err == domain.ErrNotFound) {
        //the insert if the account does not exist
        return dynamo.save(a);
      }
      else throw err;
    });
}

export default {
  upsert,
  read: dynamo.read,
  save: dynamo.save,
}
