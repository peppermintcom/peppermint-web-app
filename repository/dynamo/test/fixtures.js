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
  return uploads.save(fake.upload(r, c));
}

type MessageConfig = {
  upload?: Upload;
  sender?: Account;
  recipient?: Account;
  handled: boolean;
  read: boolean;
}
function message(options: MessageConfig): Promise<Message> {
  return messages.save(fake.message(options));
}

export default {recorder, account, upload, message}
