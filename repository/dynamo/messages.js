// @flow
import type {Query, DynamoQueryRequest, N, S} from './types'
import type {Recorder, Account, Message, Upload} from '../../domain'
import type {SaveConfig, QueryResult, QueryConfig, QueryMessagesByEmail, QueryMessagesUnread} from '../types'

type MessageItem = {
  message_id: S;
  audio_url: S;
  created: N;
  recipient_email: S;
  sender_email: S;
  sender_name?: S;
  handled?: N;
  handled_by?: S;
  outcome?: S;
  read?: N;
};

import domain from '../../domain'
import url from 'url'
import dynamo from './client'
import token from '../../utils/randomtoken'
import _ from './utils'

let encodePosition = _.encode64Obj;
let decodePosition = _.decode64Obj;

let queryEmail: Query = _.queryer(formatEmailQuery, parse, encodePosition);
let queryUnread: Query = _.queryer(formatUnreadQuery, parse, encodePosition);

//Query messages with a given email involved as either sender or recipient.
//Filters out messages that have not finished uploading by checking for the
//handled timestamp, which is added by the postprocessing lambda function after
//the putObject event fires.
function formatEmailQuery(params: QueryMessagesByEmail, options: QueryConfig): DynamoQueryRequest {
  //"sender_email" | "recipient_email"
  var primary: string = params.role + '_email';
  var r: DynamoQueryRequest = {
    TableName: 'messages',
    //"recipient_email-created-index" | "sender_email-created-index"
    IndexName: primary + '-created-index',
    //e.g. "recipient_email = :recipient_email" | "sender_email = :sender_email"
    KeyConditionExpression: primary + ' = :' + primary + ' AND created BETWEEN :start_time AND :end_time',
    ExpressionAttributeValues: {
      [':' + primary]: {S: params.email.toLowerCase()},
      ':start_time': {N: params.start_time.toString()},
      ':end_time': {N: params.end_time.toString()},
    },
    FilterExpression: 'attribute_exists(handled)',
    Limit: options.limit,
    ScanIndexForward: params.order !== 'reverse',
  };

  if (options.position) {
    r.ExclusiveStartKey = decodePosition(options.position);
  }

  return r;
}

//return all unread messages over a given time period
function formatUnreadQuery(params: QueryMessagesUnread, options: QueryConfig): DynamoQueryRequest {
  let r: DynamoQueryRequest = {
    TableName: 'messages',
    IndexName: 'recipient_email-created-index',
    KeyConditionExpression: 'recipient_email = :recipient_email AND created > :since',
    FilterExpression: 'attribute_not_exists(#read) AND attribute_exists(handled)',
    ExpressionAttributeValues: {
      ':recipient_email': {S: params.recipient_email.toLowerCase()},
      ':since': {N: params.start_time.toString()},
    },
    ExpressionAttributeNames: {
      '#read': 'read',
    },
    Limit: 200,
    //always sort newest to oldest
    ScanIndexForward: false,
  }

  return r
}

function markRead(id: string, ts: number): Promise<void> {
  //attribute_exists(message_id) ensures there is no insert if the message does
  //not exist for any reason
  let condition = 'attribute_exists(message_id)'
  let expression = 'SET #read = :ts'

  return new Promise(function(resolve, reject) {
    let params = {
      TableName: 'messages',
      Key: {
        message_id: {S: id},
      },
      UpdateExpression: expression,
      ConditionExpression: condition,
      ExpressionAttributeValues: {
        ':ts': {N: ts.toString()},
      },
      ExpressionAttributeNames: {
        '#read': 'read',
      },
    };

    dynamo.updateItem(params, function(err) {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

function parse(item: MessageItem): Message {
  var parts = _.decodePathname(item.audio_url.S);

  var r: Recorder = domain.makeRecorder({
    recorder_id: parts.recorder_id,
  })
  var u: Upload = domain.makeUpload({
    upload_id: parts.id,
    content_type: parts.content_type,
    recorder: r,
  });

  var sender: Account = domain.makeAccount({
    email: item.sender_email.S,
  })
  if (item.sender_name) {
    sender.full_name = item.sender_name.S;
  }

  var recipient: Account = domain.makeAccount({
    email: item.recipient_email.S,
  })

  return domain.makeMessage({
    message_id: item.message_id.S,
    created: +item.created.N,
    sender: sender,
    recipient: recipient,
    upload: u,
    handled: item.handled ? +item.handled.N : null,
    handled_by: item.handled_by ? item.handled_by.S : null,
    outcome: item.outcome ? item.outcome.S : null,
    read: item.read ? +item.read.N : null,
  });
}

function format(message: Message): MessageItem {
  var audioURL = 'http://go.peppermint.com/' + message.upload.pathname();
  if (!message.recipient.email) {
    throw new Error('cannot save message without recipient email');
  }
  if (!message.sender.email) {
    throw new Error('cannot save message without sender email');
  }
  var item: MessageItem = {
    message_id: {S: message.message_id},
    audio_url: {S: audioURL},
    sender_email: {S: message.sender.email},
    recipient_email: {S: message.recipient.email},
    created: {N: message.created.toString()},
  };

  if (message.sender.full_name) {
    item.sender_name = {S: message.sender.full_name};
  }
  if (message.handled) {
    item.handled = {N: message.handled.toString()};
  }
  if (message.handled_by) {
    item.handled_by = {S: message.handled_by};
  }
  if (message.outcome) {
    item.outcome = {S: message.outcome};
  }
  if (message.read) {
    item.read = {N: message.read.toString()};
  }

  return item;
}

function save(message: Message, options: SaveConfig): Promise<Message> {
  let params = {
    TableName: 'messages',
    Item: format(message),
  }

  if (options && options.checkConflict) {
    params.ConditionExpression = 'attribute_not_exists(message_id)';
  }

  return new Promise(function(resolve, reject) {
    dynamo.putItem(params, function(err) {
      if (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          reject(new Error(domain.ErrConflict))
          return
        }
        reject(err)
        return;
      }
      resolve(message);
    });
  });
}

//throws an error if the item is not found
function read(id: string): Promise<Message> {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      TableName: 'messages',
      Key: {
        message_id: {S: id},
      },
      ConsistentRead: true,
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

module.exports = {save, markRead, read, queryEmail, queryUnread}
