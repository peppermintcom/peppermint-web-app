//@flow
import type {Upload, Recorder, Message, Account} from '../../domain'

import fake from '../../fake'
import domain from '../../domain'
import recorders from '../recorders'
import uploads from '../uploads'
import messages from '../messages'
import accounts from '../accounts'
import dynamo from '../client'

function recorder(): Promise<Recorder> {
  return recorders.save(fake.recorder());
}

function account(verification_source?: string): Promise<Account> {
  return accounts.save(fake.account(verification_source));
};

function upload(r?: Recorder, c?: Account): Promise<Upload> {
  return (r ? Promise.resolve(r) : recorder())
  .then(function(recorder) {
    return uploads.save(fake.upload(recorder, c))
  })
}

type MessageConfig = {
  upload?: Upload;
  sender?: Account;
  recipient?: Account;
  created?: number;
  handled: boolean;
  read: boolean;
}
function message(options: MessageConfig): Promise<Message> {
  return Promise.all([
    options.upload ?  Promise.resolve(options.upload) : upload(),
    options.sender ?  Promise.resolve(options.sender) : account(),
    options.recipient ?  Promise.resolve(options.recipient) : account(),
  ])
  .then(function(res) {
    let msg = fake.message({
      upload: res[0],
      sender: res[1],
      recipient: res[2],
      handled: options.handled,
      read: options.read,
    })

    msg.created = options.created || msg.created

    return messages.save(msg)
  })
}

export default {recorder, account, upload, message}
