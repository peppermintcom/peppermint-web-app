//@flow
import type {Account, Message} from '../domain'
import type {QueryMessagesUnread, QueryMessagesByEmail, QueryConfig, QueryResult} from './types'

import dynamo from './dynamo/messages'
import uploads from './uploads'
import accounts from './dynamo/accounts'

function query(params: QueryMessagesByEmail, options: QueryConfig): Promise<QueryResult> {
  return dynamo.queryEmail(params, options)
  .then(function(qr) {
    return Promise.all(qr.entities.map(attachUpload))
    .then(function(messages) {
      qr.entities = messages;

      return qr;
    })
  })
}

function unread(a: Account): Promise<Message[]> {
  return dynamo.queryUnread({
    recipient_email: a.email,
    start_time: a.highwater || 0,
  })
  .then((query) => (query.entities))
}

//attachUpload looks up the upload related to a message and adds it to the
//message argument. In case the database has become inconsistent and the upload
//record does not exist, the promise will fail with an error. This uses the
//uploads.read routine from the sibling module which includes a transcription
//lookup.
function attachUpload(m: Message): Promise<Message> {
  return uploads.read(m.upload.pathname())
    .then(function(upload) {
      m.upload = upload;

      return m;
    })
}

//markRead sets the highwater mark on the account so the message argument and
//all messages with a created timestamp before it are removed from the set of
//unread messages.
function markRead(a: Account, m: Message): Promise<void> {
  let ts = Date.now()

  return dynamo.queryUnread({
    start_time: 0,
    recipient_email: a.email
  })
  .then(function(unreads) {
    let justRead = unreads.entities.filter((message) => (
      message.created <= m.created
    ))
    //set the individual read timestamp on each item
    return Promise.all(justRead.map((message) => (dynamo.markRead(message.message_id, ts))))
  })
  .then(function() {
    //set the highwater mark on the account item
    return accounts.setHighwater(a.email, m.created)
  })
}

export default {
  query,
  unread: unread,
  read: dynamo.read,
  markRead: markRead,
  save: dynamo.save,
}
