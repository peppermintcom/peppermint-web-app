import type {Account} from '../../domain'
import type {SaveConfig} from '../types'

import domain from '../../domain'
import dynamo from './client'
import _ from './utils'

export type AccountItem = {
  email: S;
  account_id: S;
  full_name: S;
  password?: S;
  registration_ts: N;
  verification_ts?: N;
  verification_ip?: S;
  highwater?: N;
}

function save(a: Account, options?: SaveConfig): Promise<Account> {
  return new Promise(function(resolve, reject) {
    let params = {
      TableName: 'accounts',
      Item: format(a),
    }

    if (options && options.checkConflict) {
      params.ConditionExpression = 'attribute_not_exists(email)'
    }
    dynamo.putItem(params, function(err) {
      if (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          reject(domain.ErrConflict);
          return;
        }
        reject(err);
        return;
      }
      resolve(a);
    });
  });
}

function del(email: string): Proimse<void> {
  return new Promise(function(resolve, reject) {
    dynamo.deleteItem({
      TableName: 'accounts',
      Key: {email: {S: email}},
    }, function(err) {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

function setHighwater(email: string, ts: number): Promise<void> {
  return new Promise(function(resolve, reject) {
    let params = {
      TableName: 'accounts',
      Key: {
        email: {S: email.toLowerCase()},
      },
      UpdateExpression: 'SET highwater = :highwater',
      ConditionExpression: 'attribute_not_exists(highwater) OR highwater < :highwater',
      ExpressionAttributeValues: {
        ':highwater': {N: ts.toString()},
      },
    };

    dynamo.updateItem(params, function(err) {
      if (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          //success
          resolve();
          return
        }
        reject(err)
        return
      }
      resolve()
    })
  })
}

function read(email: string): Promise<Account> {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      TableName: 'accounts',
      Key: {
        email: {S: email.toLowerCase()},
      }
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (!data || !data.Item) {
        reject(domain.ErrNotFound);
        return;
      }
      resolve(parse(data.Item));
    });
  });
}

function readNull(email: string): Promise<?Account> {
  return read(email).catch(_.nullOK)
}

function readByID(accountID: string): Promise<Account> {
  return new Promise(function(resolve, reject) {
    dynamo.query({
      TableName: 'accounts',
      IndexName: 'account_id-index',
      KeyConditionExpression: 'account_id = :account_id',
      ExpressionAttributeValues: {
        ':account_id': {S: accountID},
      },
    }, function(err, data) {
      if (err) {
        reject(err)
        return
      }
      if (data.Count === 0) {
        reject(domain.ErrNotFound)
        return
      }
      if (data.Count > 1) {
        var msg = 'account lookup by id "' + accountID + '" returned multiple accounts'
        reject(new Error(msg))
        return
      }
      resolve(parse(data.Items[0]))
    })
  })
}

function format(a: Account): AccountItem {
  var item: AccountItem = {
    email: {S: a.email},
    account_id: {S: a.account_id},
    full_name: {S: a.full_name},
    registration_ts: {N: a.registered.toString()},
  };

  if (a.pass_hash) {
    item.password = {S: a.pass_hash}
  }
  if (a.verified) {
    item.verification_ts = {N: a.verified.toString()};
  }
  if (a.verification_source) {
    item.verification_ip = {S: a.verification_source};
  }
  if (a.highwater) {
    item.highwater = {N: a.highwater.toString()};
  }

  return item;
}

function parse(item: AccountItem): Account {
  return domain.makeAccount({
    email: item.email.S,
    account_id: item.account_id.S,
    full_name: item.full_name.S,
    pass_hash: item.password ? item.password.S: null,
    registered: +item.registration_ts.N,
    verified: item.verification_ts ? +item.verification_ts.N : null,
    verification_source: item.verification_ip ? item.verification_ip.S : null,
    highwater: item.highwater ? +item.highwater.N : null,
  });
}

module.exports = {save, delete: del, setHighwater, read, readNull, readByID};
