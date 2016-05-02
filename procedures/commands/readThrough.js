//@flow
//Mark all messages up to a given message as read.
//
//1. Keep a pointer on the account record. Move the pointer.
//2. unreadMessages gets everything after the pointer
//3. Read moves the pointer.
//4. Mark all messages with read timestamp

export type Request = {
  message_id: string;
  recipient_email: string;
}

export default function(req: Request): Promise<void> {
  return messages.unread(req.recipient_email, message_id)
  .then(function(unread) {
    return messages.markRead(Date.now(), unread)
  })
}
