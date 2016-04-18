//@flow
import type {Upload, Recorder, Message, Account} from '../../domain'

import fake from '../../../utils/fake'
import token from '../../../utils/randomtoken'
import domain from '../../domain'
import recorders from '../recorders'
import uploads from '../uploads'
import messages from '../messages'
import accounts from '../accounts'
import dynamo from '../client'

function recorder(): Promise<Recorder> {
  var r = domain.newRecorder({
    api_key: fake.API_KEY,
    description: 'test fixture',
    recorder_key_hash: 'secret',
  });

  return recorders.save(r);
}

function account(verification_source?: string): Promise<Account> {
  return accounts.save(domain.newAccount({
    email: token(12) + '@mailinator.com',
    full_name: 'Satoshi ' + token(8),
    pass_hash: 'secret',
    verification_source: verification_source || null,
  }));
};

function upload(r?: Recorder, c?: Account): Promise<Upload> {
  return (r ? Promise.resolve(r) : recorder())
    .then(function(recorder) {
      return uploads.save(domain.newUpload({
        recorder: recorder,
        creator: c || null,
        content_type: 'audio/mp4',
      }));
    });
}

type MessageConfig = {
  upload?: Upload;
  sender?: Account;
  recipient?: Account;
  handled: boolean;
  read: boolean;
}
function message(options: MessageConfig): Promise<Message> {
  return Promise.all([
      options.sender ? Promise.resolve(options.sender) : account(),
      options.recipient ? Promise.resolve(options.recipient) : account(),
      options.upload ? Promise.resolve(options.upload) : upload(),
    ])
    .then(function(results) {
      var message = domain.newMessage({
        sender: results[0],
        recipient: results[1],
        upload: results[2],
      });

      if (options.handled) {
        message.handled = Date.now();
        message.handled_by = 'fixtures';
        message.outcome = 'ok';
      }
      if (options.read) {
        message.read = Date.now();
      }

      return messages.save(message);
    });
}

module.exports = {recorder, account, upload, message};
