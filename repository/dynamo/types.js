// @flow
import type {Entity} from '../domain'

//string, number, boolean in dynamoDB
export type S = {S: string};
export type N = {N: string};
export type B = {B: string};
export type Value = S | N | B;
export type Item = { [key: string]: Value }

export type QueryRequest = {
  TableName: string;
  IndexName: string;
  KeyConditionExpression: string;
  ExpressionAttributeValues: Object;
  FilterExpression?: string;
  Limit: number;
  ExclusiveStartKey?: Object;
}
export type QueryResult = {entities: Entity[]; next?: string};
export type Query = (params: Object)=>Promise<QueryResult>

export type ParseEntity = (item: Object) => Entity
export type FormatRequest = (params: Object) => QueryRequest
