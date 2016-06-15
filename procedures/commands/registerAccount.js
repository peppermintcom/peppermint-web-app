//@flow
import type {Account} from '../../domain'

import domain from '../../domain'
import accounts from '../../repository/accounts'
import _ from '../../utils'

type Request = {
  email: string;
  password: string;
  full_name: string;
}

type Response = {
  access_token: string;
  account: Account;
}

export var Errors = {
  Conflict: new Error(domain.ErrConflict),
}

//hash the password, save the account record, and send a verification email to
//the account's email address
export default function(req: Request): Promise<Response> {
  return _.bcryptHash(req.password)
  .then(function(pass_hash) {

    return accounts.save(domain.newAccount({
      email: req.email,
      pass_hash: pass_hash,
      full_name: req.full_name,
      verification_source: null,
    }), {checkConflict: true})
    .then(function(account) {

      //Ignore the error. Clients can request a new verification email if needed
      if (process.env.NODE_ENV === 'production') {
        _.accounts.verifyEmail(req.email, req.full_name)
      }

      delete account.pass_hash;

      return {
        access_token: _.jwt.creds(account.account_id),
        account: account,
      };
    });
  });
}
