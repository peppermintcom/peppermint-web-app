//@flow
import type {Upload, Recorder, Message, Account} from './domain'

import fake from '../utils/fake'
import token from '../utils/randomtoken'
import domain from './domain'

const API_KEY = 'abc123'

let name = (): string => 'Satoshi ' + token(8)
let email = (): string => token(8) + '@mailinator.com'
let secret = (): string => token(12)

function recorder(): Recorder {
  return domain.newRecorder({
    api_key: fake.API_KEY,
    client_id: token(22),
    description: 'test fixture',
    recorder_key_hash: 'secret',
  });
}

function account(verification_source?: string): Account {
  return domain.newAccount({
    email: email(),
    full_name: name(),
    pass_hash: secret(),
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

export default {API_KEY, name, email, secret, recorder, account, upload, message}
