// @flow
import type {Query, DynamoQueryRequest, N, S} from './types'
import type {Recorder, Account, Message, Upload} from '../domain'
import type {QueryResult, QueryConfig, QueryMessagesByEmail} from '../types'

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

import domain from '../domain'
import url from 'url'
import dynamo from './client'
import token from '../../utils/randomtoken'
import _ from './utils'

const LIMIT = 40;

let encodePosition = _.encode64Obj;
let decodePosition = _.decode64Obj;

let queryEmail: Query = _.queryer(formatEmailQuery, parse);
//may be expanded to support dynamic dispatch in the future
let query = queryEmail;

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
    KeyConditionExpression: primary + ' = :' + primary,
    ExpressionAttributeValues: { [':' + primary]: {S: params.email.toLowerCase()} },
    FilterExpression: 'attribute_exists(handled)',
    Limit: options.limit,
  };

  if (options.position) {
    r.ExclusiveStartKey = decodePosition(options.position);
  }

  return r;
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

  var sender: Account = {
    email: item.sender_email.S,
  }
  if (item.sender_name) {
    sender.full_name = item.sender_name.S;
  }

  var recipient: Account = {
    email: item.recipient_email.S,
  }

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


function save(message: Message): Promise<Message> {
  return new Promise(function(resolve, reject) {
    dynamo.putItem({
      TableName: 'messages',
      Item: format(message),
    }, function(err) {
      if (err) {
        reject(err);
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

module.exports = {save, read, query}
