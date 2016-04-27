//@flow
//Mark all messages up to a given message as read.
//
//1. repository.unreadMessages by recipient
//2. update each with read timestamp if less than read message
//
//1. repository.

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
