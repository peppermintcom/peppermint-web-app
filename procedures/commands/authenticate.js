//@flow
import type {Recorder, Account} from '../../domain'

import domain from '../../domain'
import recorders from '../../repository/recorders'
import accounts from '../../repository/accounts'
import auth from '../../utils/auth'
import bcrypt from '../../utils/bcrypt'
import jwts from '../../utils/jwt'
import uuid from '../../utils/uuid'

type Creds = {
  user?: string;
  password?: string;
}

export type Request = {
  recorder?: Creds;
  account?: Creds;
  google?: Creds;
  facebook?: Creds;
}

type Response = {
  access_token: ?string;
  recorder: ?Recorder;
  account: ?Account;
}

export var Errors = {
  MultipleAccountStrategies: 'Only 1 of account, google, or facebook may be supplied.',
  NoCredentials: 'Either account or recorder credentials must be supplied.',
  NoAccount: 'Account not found.',
  NoRecorder: 'Recorder not found.',
  WrongAccountPassword: 'Account password is incorrect.',
  WrongRecorderKey: 'Recorder key is incorrect.',
  ProviderAccessTokenRejected: 'Third-party authentication provider rejected access token.',
};

//TODO return type should be more precise
export function validate(req: Request): ?Object {
  //only 1 of account, google, or facebook may be defined
  if (req.account && (req.google || req.facebook)) {
    return new Error(Errors.MultipleAccountStrategies);
  }
  if (req.google && req.facebook) {
    return new Error(Errors.MultipleAccountStrategies);
  }
  if (!(req.recorder || req.account || req.google || req.facebook)) {
    return new Error(Errors.NoCredentials);
  }
}

//Will be rejected with one of the defined Errors in case of caller error.
export default function(req: Request): Promise<Response> {
  let err = validate(req)
  
  if (err) {
    return Promise.reject(err);
  }

  return Promise.all([
    //recorder.user is the client_id, the key in the recorders table
    req.recorder ? recorders.readNull(req.recorder.user) : Promise.resolve(null),
    req.account ? accounts.readNull(req.account.user) : Promise.resolve(null),
    req.google ? auth.google(req.google).then(upsert) : Promise.resolve(null),
    req.facebook ? auth.facebook(req.facebook).then(upsert) : Promise.resolve(null),
  ])
  .then(function(results) {
    let recorder: ?Recorder = results[0];
    let account: ?Account = results[1] || results[2] || results[3];

    if (req.recorder && !recorder) {
      throw new Error(Errors.NoRecorder);
    }
    if (req.account && !account) {
      throw new Error(Errors.NoAccount);
    }

    return Promise.all([
      req.account ? bcrypt.check(req.account.password, account && account.pass_hash) : Promise.resolve(),
      req.recorder ? bcrypt.check(req.recorder.password, recorder && recorder.recorder_key_hash) : Promise.resolve(),
    ])
    .then(function(results) {
      let accountOK = results[0];
      let recorderOK = results[1];

      if (req.account && !accountOK) {
        throw new Error(Errors.WrongAccountPassword);
      }
      if (req.recorder && !recorderOK) {
        throw new Error(Errors.WrongRecorderKey);
      }
      if (recorder) {
        delete recorder.recorder_key_hash;
      }
      if (account) {
        delete account.pass_hash;
      }
 
      let id = uuid()

      return {
        token_id: id,
        access_token: jwts.creds(account && account.account_id, recorder && recorder.recorder_id, id),
        account: account,
        recorder: recorder,
      };
    });
  });
}

//call domain.newAccount on Facebook/Google auth result
type thirdPartyAuth = {
  email: string;
  full_name: string;
  source: 'facebook' | 'google';
}
function upsert(identity: Object) {
  return accounts.upsert(domain.newAccount({
    email: identity.email,
    full_name: identity.full_name,
    verification_source: identity.source,
  }))
}
