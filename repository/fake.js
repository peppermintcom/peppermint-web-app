//@flow
import type {Upload, Recorder, Message, Account} from './domain'

import fake from '../utils/fake'
import token from '../utils/randomtoken'
import domain from './domain'

function recorder(): Recorder {
  return domain.newRecorder({
    api_key: fake.API_KEY,
    description: 'test fixture',
    recorder_key_hash: 'secret',
  });
}

function account(verification_source?: string): Account {
  return domain.newAccount({
    email: token(12) + '@mailinator.com',
    full_name: 'Satoshi ' + token(8),
    pass_hash: 'secret',
    verification_source: verification_source || null,
  });
};

function upload(r?: Recorder, c?: Account): Upload {
  return domain.newUpload({
    recorder: r || recorder(),
    creator: c || null,
    content_type: 'audio/mp4',
  });
}

type MessageConfig = {
  upload?: Upload;
  sender?: Account;
  recipient?: Account;
  handled: boolean;
  read: boolean;
}
function message(options: MessageConfig): Message {
  let message = domain.newMessage({
    sender: options.sender || account(),
    recipient: options.recipient || account(),
    upload: options.upload || upload(),
  });

  if (options.handled) {
    message.handled = Date.now();
    message.handled_by = 'fixtures';
    message.outcome = 'ok';
  }
  if (options.read) {
    message.read = Date.now();
  }

  return message;
}

export default {recorder, account, upload, message}
