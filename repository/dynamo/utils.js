// @flow
import type {Entity} from '../../domain'
import type {QueryConfig, QueryResult} from '../types'
import type {Query, ParseEntity, FormatRequest, EncodePosition} from './types'

import domain from '../../domain'
import dynamo from './client'
import _ from '../utils'

//queryResult parses the data object returned in the callback to dynamo.query.
function queryResult(parseEntity: Function, encodePosition: Function, data: Object): QueryResult {
  var r: QueryResult = {
    entities: ((data && data.Items) || []).map(parseEntity),
  };
  var position = data && data.LastEvaluatedKey;

  return position ? Object.assign(r, {position: encodePosition(position)}) : r;
}

//queryer returns a function that runs a query against dynamo in a Promise and
//parses the response.
function queryer(format: FormatRequest, parse: ParseEntity, encode: EncodePosition): Query {
  return function(params: Object, options: QueryConfig): Promise<QueryResult> {
    let dynamoParams

    try {
      dynamoParams = format(params, options)
    } catch (e) {
      let err: Object = new Error('400')
      err.detail = 'Invalid'
      return Promise.reject(err)
    }

    return new Promise(function(resolve, reject) {
      dynamo.query(dynamoParams, function(err, data) {
        if (err || (data == null)) {
          reject(err);
          return;
        }
        resolve(queryResult(parse, encode, data));
      });
    });
  }
}

//accmQuery keeps calling query until the min number of items have been accumulated.
function accmQuery(query: Query, min: number, params: Object, memo?: Entity[]): Promise<QueryResult> {
  return query(params)
    .then(function(qr) {
      if (typeof memo === 'undefined') {
        memo = [];
      }
      if (qr.position && qr.entities.length < min) {
        return accmQuery(query, min, params, memo.concat(qr.entities));
      }
      qr.entities = memo.concat(qr.entities);
      return qr;
    });
}

//encode64Obj returns the base64 encoding of a JSON.stringified object. It can be
//used as a default position encoder for LastEvalutedKey.
function encode64Obj(o: Object): string {
  return encodeURIComponent(Buffer(JSON.stringify(o)).toString('base64'));
}

//decode64Obj parses an object encoded with encode64Obj. It can be used as a
//default decoder for ExclusiveStartKey.
function decode64Obj(s: string): Object {
  return JSON.parse(Buffer(decodeURIComponent(s), 'base64').toString('utf8'));
}

//read a record but convert ErrNoEntity to null without an error. Use inside a
//catch block after a read operation.
function nullOK(err) {
  if (err.message === domain.ErrNoEntity) {
    return null
  }
  throw err
}

module.exports = Object.assign({}, _, {queryResult, queryer, accmQuery, encode64Obj, decode64Obj, nullOK});
