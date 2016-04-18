//@flow
import type {Account, Message} from './domain'
import type {QueryMessagesByEmail, QueryResult} from './types'

import token from 'utils/randomtoken'
import messages from './dynamo/messages'
import uploads from './uploads'


//querySender fetches messages sent by an email and includes the
//upload/transcription with each returned message.
function querySender(a: Account, next?: string): Promise<QueryResult> {
  let q: QueryMessagesByEmail = {
    email: a.email,
    role: 'sender',
    offset: next,
  };

  return messages.query(q)
    .then(function(messages) {
      return Promise.all(messages.map(attachUpload));
    });
}

//querySender fetches messages received by an email and includes the
//upload/transcription with each returned message.
function queryRecipient(a: Account, next?: string): Promise<QueryResult> {
  let q: QueryMessagesByEmail = {
    email: a.email,
    role: 'recipient',
    offset: next,
  };

  return messages.query(q)
    .then(function(messages) {
      return Promise.all(messages.map(attachUpload));
    });
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
    });
}

module.exports = {
  save: messages.save,
  read: messages.read,
  querySender: querySender,
  queryRecipient: queryRecipient,
};
