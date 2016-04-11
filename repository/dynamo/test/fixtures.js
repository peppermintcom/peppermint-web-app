//@flow
import type {Message} from '../../domain'

import fake from 'utils/fake'
import token from 'utils/randomtoken'
import messages from '../messages'
import dynamo from '../client'

function user(): Object {
  return {
    email: token(12) + '@mailinator.com',
    full_name: 'Satoshi ' + token(8),
    password: 'secret',
  };
};

type MessageAttrs = {
  sender?: Object;
  recipient?: Object;
  handled: boolean;
}
function message(options: MessageAttrs): Promise<Message> {
  var sender = options.sender || user();
  var recipient = options.recipient || user();

  var m: Message = messages.factory({
    sender_email: sender.email,
    sender_name: sender.name,
    recipient_email: recipient.email,
    audio_url: fake.AUDIO_URL,
  });

  if (options.handled) {
    m.handled = Date.now();
  }

  return messages.save(m)
    .then(function() {
      return m;
    });
}

module.exports = {user, message};
