// @flow
import type {Entity} from '../domain'
import type {QueryRequest, QueryResult, Query, ParseEntity, FormatRequest} from './types'

import dynamo from './client'

//queryResult parses the data object returned in the callback to dynamo.query.
function queryResult(parseEntity: Function, data: Object): QueryResult {
  var r: QueryResult = {
    entities: ((data && data.Items) || []).map(parseEntity),
  };
  var next = data && data.LastEvaluatedKey;

  return next ? Object.assign(r, { next }) : r;
}

//queryer returns a function that runs a query against dynamo in a Promise and
//parses the response.
function queryer(format: FormatRequest, parse: ParseEntity): Query {
  return function(params: Object): Promise<QueryResult> {
    return new Promise(function(resolve, reject) {
      dynamo.query(format(params), function(err, data) {
        if (err || (data == null)) {
          reject(err);
          return;
        }
        resolve(queryResult(parse, data));
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
      if (qr.next && qr.entities.length < min) {
        return accmQuery(query, min, params, memo.concat(qr.entities));
      }
      qr.entities = memo.concat(qr.entities);
      return qr;
    });
}

//encode64Obj returns the base64 encoding of a JSON.stringified object. It can be
//used as a default next encoder for LastEvalutedKey.
function encode64Obj(o: Object): string {
  return encodeURIComponent(Buffer(JSON.stringify(o)).toString('base64'));
}

//decode64Obj parses an object encoded with encode64Obj. It can be used as a
//default decoder for ExclusiveStartKey.
function decode64Obj(s: string): Object {
  return JSON.parse(Buffer(decodeURIComponent(s), 'base64').toString('utf8'));
}

module.exports = {queryResult, queryer, accmQuery, encode64Obj, decode64Obj}
