//@flow
import domain from '../../domain'
import messages from '../../repository/messages'
import accounts from '../../repository/accounts'

//Mark all messages up to a given message as read.
//1. Keep a highwater timestamp on the account record. Every record up through
//this one is designated as read.
//2. Querying unread messages gets everything after the account's highwater
//timestamp.
//3. Reading a message can only move the timestamp forward.
//4. Also keep read timestamp on each message for legacy compatibility and to
//avoid account lookup to see if message is read.

export type Request = {
  message_id: string;
  recipient_id: string;
}

export default function(req: Request): Promise<void> {
  return Promise.all([
    messages.read(req.message_id),
    accounts.readByID(req.recipient_id),
  ])
  .then(function(results) {
    let message = results[0]
    let recipient = results[1]

    if (message.recipient.email !== recipient.email) {
      throw new Error(domain.ErrForbidden)
    }

    return messages.markRead(recipient, message)
  })
}
