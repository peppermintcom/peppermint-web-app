import type {Recorder} from '../domain'
import type {S, N} from './types'

import {ErrNotFound} from '../domain'
import dynamo from './client'

type RecorderItem = {
  recorder_id: S;
  client_id: S;
  api_key: S;
  recorder_key: S;
  recorder_ts: S;
  description?: S;
  gcm_registration_token?: S;
}

function save(r: Recorder): Promise<Recorder> {
  return new Promise(function(resolve, reject) {
    dynamo.putItem({
      TableName: 'recorders',
      Item: format(r),
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(r);
    });
  });
}

function read(clientID: string): Promise<Recorder> {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      TableName: 'recorders',
      Key: {
        client_id: {S: clientID},
      },
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (!data || !data.Item) {
        reject(ErrNotFound);
        return;
      }
      resolve(parse(data.Item));
    });
  });
}

function format(r: Recorder): RecorderItem {
  if (!r.client_id) {
    throw new Error('client_id is required when saving a recorder');
  }
  if (!r.api_key) {
    throw new Error('api_key is required when saving a recorder');
  }
  if (!r.recorder_key_hash) {
    throw new Error('recorder_key_hash is required when saving a recorder');
  }
  if (!r.registered) {
    throw new Error('registered timestamp is required when saving a recorder');
  }

  var item: RecorderItem = {
    recorder_id: {S: r.recorder_id},
    client_id: {S: r.client_id},
    api_key: {S: r.api_key},
    recorder_key: {S: r.recorder_key_hash},
    registered: {N: r.registered.toString()},
  };

  if (r.description) {
    item.description = {S: r.description};
  }
  if (r.gcm_registration_token) {
    item.gcm_registration_token = {S: r.gcm_registration_token};
  }

  return item;
}

function parse(item: RecorderItem): Recorder {
  return {
    recorder_id: item.recorder_id.S,
    client_id: item.client_id.S,
    api_key: item.api_key.S,
    recorder_key_hash: item.recorder_key.S,
    registered: +item.registered.N,
    description: item.description ? item.description.S : null,
    gcm_registration_token: item.gcm_registration_token ? item.gcm_registration_token.S : null,
  };
}

module.exports = {save, read};
