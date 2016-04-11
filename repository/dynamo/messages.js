// @flow
import type {Query, QueryRequest, QueryResult, N, S} from './types'
import type {Message} from '../domain'

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

var dynamo = require('./client');
var token = require('utils/randomtoken');
var _ = require('./utils');

const LIMIT = 40;

let encodeNext = _.encode64Obj;
let decodeNext = _.decode64Obj;

let queryEmail: Query = _.queryer(formatEmailQuery, parse);
//may be expanded to support dynamic dispatch in the future
let query = queryEmail;

//Query messages with a given email involved as either sender or recipient.
//Filters out messages that have not finished uploading by checking for the
//handled timestamp, which is added by the postprocessing lambda function after
//the putObject event fires.
//type FormatRequest
type EmailQuery = {
  email: string;
  role: 'sender' | 'recipient';
  offset?: string;
}
function formatEmailQuery(params: EmailQuery): QueryRequest {
  //"sender_email" | "recipient_email"
  var primary: string = params.role + '_email';
  var r: QueryRequest = {
    TableName: 'messages',
    //"recipient_email-created-index" | "sender_email-created-index"
    IndexName: primary + '-created-index',
    //e.g. "recipient_email = :recipient_email" | "sender_email = :sender_email"
    KeyConditionExpression: primary + ' = :' + primary,
    ExpressionAttributeValues: { [':' + primary]: {S: params.email.toLowerCase()} },
    FilterExpression: 'attribute_exists(handled)',
    Limit: LIMIT,
  };

  if (params.offset) {
    r.ExclusiveStartKey = decodeNext(params.offset);
  }

  return r;
}

function parse(item: MessageItem): Message {
  var m: Message = {
    message_id: item.message_id.S,
    audio_url: item.audio_url.S,
    created: +item.created.N,
    recipient_email: item.recipient_email.S,
    sender_email: item.sender_email.S,
  };

  if (item.sender_name) {
    m.sender_name = item.sender_name.S;
  }
  if (item.handled) {
    m.handled = +item.handled.N;
  }
  if (item.handled_by) {
    m.handled_by = item.handled_by.S;
  }
  if (item.outcome) {
    m.outcome = item.outcome.S;
  }
  if (item.read) {
    m.read = +item.read.N;
  }

  return m;
}

function format(message: Message): MessageItem {
  var item: MessageItem = {
    message_id: {S: message.message_id},
    audio_url: {S: message.audio_url},
    sender_email: {S: message.sender_email.toLowerCase()},
    recipient_email: {S: message.recipient_email.toLowerCase()},
    created: {N: message.created.toString()},
  };

  if (message.sender_name) {
    item.sender_name = {S: message.sender_name};
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

//factory returns a new object with created and message_id properties added and
//with the sender_email and recipient_email lowercased;
type attrs = {
  audio_url: string;
  recipient_email: string;
  sender_email: string;
  sender_name?: string;
};
function factory(m: attrs): Message {
  return Object.assign({}, m, {
    created: Date.now(),
    message_id: token(22),
    sender_email: m.sender_email.toLowerCase(),
    recipient_email: m.recipient_email.toLowerCase(),
  });
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
      if (err || !data || !data.Item) {
        reject(err);
        return;
      }
      resolve(parse(data.Item));
    });
  });
}

module.exports = {factory, save, read, query}
