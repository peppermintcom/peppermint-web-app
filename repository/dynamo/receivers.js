//@flow
import type {S} from './types'
import type {Recorder} from '../../domain'

import domain from '../../domain'
import dynamo from './client'
import _ from './utils'

type Item = {
  recorder_id: S;
  account_id: S;
}

type Receiver = {
  recorder_id: string;
  account_id: string;
}

let save = (recorderID: string, accountID: string): Promise<Receiver> => {
  let r = {recorder_id: recorderID, account_id: accountID}
  return new Promise(function(resolve, reject) {
    dynamo.putItem({
      TableName: 'receivers',
      Item: format(r),
    }, function(err, data) {
      if (err) {
        reject(err)
        return
      }
      resolve(r)
    })
  })
}

let read = (recorderID: string, accountID: string): Promise<Receiver> => {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      TableName: 'receivers',
      Key: {
        recorder_id: {S: recorderID},
        account_id: {S: accountID},
      },
    }, function(err, data) {
      if (err) {
        reject(err)
        return
      }
      if (!data || !data.Item) {
        reject(new Error(domain.ErrNoEntity))
        return
      }
      resolve(parse(data.Item))
    })
  })
}

let readNull = (recorderID: string, accountID: string): Promise<?Receiver> => {
  return read(recorderID, accountID).catch(_.nullOK)
}

let recorder_ids = (accountID: string): Promise<Recorder[]> => {
  return new Promise(function(resolve, reject) {
    dynamo.query({
      TableName: 'receivers',
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

      resolve((data.Items || []).map(parse).map((r) => (r.recorder_id)))
    })
  })
}

let parse = (i: Item): Receiver => ({
  recorder_id: i.recorder_id.S,
  account_id: i.account_id.S,
})

let format = (r: Receiver): Item => ({
  recorder_id: {S: r.recorder_id},
  account_id: {S: r.account_id},
})

export default {
  save,
  read,
  readNull,
  recorder_ids
}
