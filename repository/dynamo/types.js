// @flow
import type {Entity} from '../../domain'
import type {QueryConfig, QueryResult} from '../types'

//string, number, boolean in dynamoDB
export type S = {S: string};
export type N = {N: string};
export type B = {B: string};
export type SS = {SS: string[]};
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
export type Query = (params: Object, options: QueryConfig)=>Promise<QueryResult>

export type ParseEntity = (item: Object) => Entity
export type FormatRequest = (params: Object) => DynamoQueryRequest
export type EncodePosition = (last: {[name:string]: DynamoValue}) => string
