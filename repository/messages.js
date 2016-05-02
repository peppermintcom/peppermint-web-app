//@flow
import type {Account, Message} from './domain'
import type {QueryMessagesUnread, QueryMessagesByEmail, QueryConfig, QueryResult} from './types'

import dynamo from './dynamo/messages'
import uploads from './uploads'

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

export default {
  query,
  unread: dynamo.queryUnread,
  read: dynamo.read,
  save: dynamo.save,
}
