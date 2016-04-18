import type {Account} from '../domain'

import dynamo from './client'

export type AccountItem = {
  email: S;
  account_id: S;
  full_name: S;
  password?: S;
  registration_ts: N;
  verification_ts?: N;
  verification_ip?: S;
}

function save(a: Account): Promise<Account> {
  return new Promise(function(resolve, reject) {
    dynamo.putItem({
      TableName: 'accounts',
      Item: format(a),
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(a);
    });
  });
}

function read(a: Account): Promise<Account> {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      TableName: 'accounts',
      Key: {
        email: {S: email},
      }
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (!data || !data.Item) {
        reject(ErrNotFound);
        return;
      }
      resolve(parse(data.item));
    });
  });
}

function format(a: Account): AccountItem {
  var item: AccountItem = {
    email: {S: a.email},
    account_id: {S: a.account_id},
    full_name: {S: a.full_name},
    password: {S: a.pass_hash},
    registration_ts: {N: a.registered.toString()},
  };

  if (a.verified) {
    item.verification_ts = {N: a.verified.toString()};
  }
  if (a.verification_source) {
    item.verification_ip = {S: a.verification_source};
  }

  return item;
}

function parse(item: AccountItem): Account {
  return {
    email: item.email.S,
    account_id: item.account_id.S,
    full_name: item.full_name.S,
    pass_hash: item.password.S,
    registered: +item.registration_ts.N,
    verified: item.verification_ts ? +item.verification_ts : null,
    verification_source: item.verification_ip ? item.verification_ip.S : null,
  };
}

module.exports = {save, read};
