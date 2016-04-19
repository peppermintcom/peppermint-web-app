//@flow
import type {Recorder, Account} from '../../repository/domain'

import recorders from '../../repository/recorders'
import accounts from '../../repository/accounts'
import auth from '../../utils/auth'
import _ from '../../utils'

type Creds = {
  user?: string;
  password?: string;
}

type AccessToken = string;

export type Request = {
  recorder?: Creds;
  account?: Creds;
  google?: AccessToken;
  facebook?: AccessToken;
}

type Response = {
  access_token: ?string;
  recorder: ?Recorder;
  account: ?Account;
}

export var Errors = {
  MultipleAccountStrategies: new Error('Only 1 of account, google, or facebook may be supplied.'),
  NoCredentials: new Error('Either account or recorder credentials must be supplied.'),
  NoAccount: new Error('Account not found.'),
  NoRecorder: new Error('Recorder not found.'),
  WrongAccountPassword: new Error('Account password is incorrect.'),
  WrongRecorderKey: new Error('Recorder key is incorrect.'),
  ProviderAccessTokenRejected: new Error('Third-party authentication provider rejected access token.'),
};

//TODO return type should be more precise
export function validate(req: Request): ?Object {
  //only 1 of account, google, or facebook may be defined
  if (req.account && (req.google || req.facebook)) {
    return Errors.MultipleAccountStrategies;
  }
  if (req.google && req.facebook) {
    return Errors.MultipleAccountStrategies;
  }
  if (!(req.recorder || req.account || req.google || req.facebook)) {
    return Errors.NoCredentials;
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
    req.recorder ? recorders.read(req.recorder.user) : Promise.resolve(null),
    req.account ? accounts.read(req.account.user) : Promise.resolve(null),
    req.google ? auth.google(req.google).then(accounts.upsert) : Promise.resolve(null),
    req.facebook ? auth.facebook(req.facebook).then(accounts.upsert) : Promise.resolve(null),
  ])
  .then(function(results) {
    let recorder: ?Recorder = results[0];
    let account: ?Account = results[1] || results[2] || results[3];

    if (req.recorder && !recorder) {
      throw Errors.NoRecorder;
    }
    if (req.account && !account) {
      throw Errors.NoAccount;
    }

    return Promise.all([
      req.account ? _.bcryptCheck(req.account.password, account && account.pass_hash) : Promise.resolve(),
      req.recorder ? _.bcryptCheck(req.recorder.password, recorder && recorder.recorder_key_hash) : Promise.resolve(),
    ])
    .then(function(results) {
      let accountOK = results[0];
      let recorderOK = results[1];

      if (req.account && !accountOK) {
        throw Errors.WrongAccountPassword;
      }
      if (req.recorder && !recorderOK) {
        throw Errors.WrongRecorderKey;
      }
      if (recorder) {
        delete recorder.recorder_key_hash;
      }
      if (account) {
        delete account.pass_hash;
      }
 
      return {
        access_token: _.jwt.creds(account && account.account_id, recorder && recorder.recorder_id, _.uuid()),
        account: account,
        recorder: recorder,
      };
    });
  });
}
