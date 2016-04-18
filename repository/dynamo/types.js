// @flow
import type {Entity} from '../domain'
import type {QueryResult} from '../types'

//string, number, boolean in dynamoDB
export type S = {S: string};
export type N = {N: string};
export type B = {B: string};
export type DynamoValue = S | N | B;
export type Item = { [key: string]: DynamoValue }

export type DynamoQueryRequest = {
  TableName: string;
  IndexName: string;
  KeyConditionExpression: string;
  ExpressionAttributeValues: Object;
  FilterExpression?: string;
  Limit: number;
  ExclusiveStartKey?: Object;
}
export type Query = (params: Object)=>Promise<QueryResult>

export type ParseEntity = (item: Object) => Entity
export type FormatRequest = (params: Object) => DynamoQueryRequest
