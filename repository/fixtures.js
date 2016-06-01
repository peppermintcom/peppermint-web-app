//@flow
import type {Recorder, Upload, Account, Message} from '../domain'

import domain from '../domain'
import fake from '../domain/fake'
import recorders from './recorders'
import uploads from './uploads'
import accounts from './accounts'
import Messages from './messages'
import _jwt from '../utils/jwt'
import _token from '../utils/randomtoken'
import gcmMocks from '../utils/gcmMocks'
import transcriptions from './dynamo/transcriptions'

const UPLOAD_KEY = 'rqChdm4DpdCKkJHKbeVzhH/BgHX49oM3NG7fz8cuRr6K8.mp3'
const API_KEY = 'abc123'
const ANDROID_API_KEY = 'android-dev'
const IOS_API_KEY = 'ios-dev'

type recorderConfig = {
  description?: string;
  api_key?: string;
}
function recorder(config?: recorderConfig): Promise<Recorder> {
  let recorder: Recorder = domain.newRecorder({
    api_key: (config && config.api_key) || API_KEY,
    client_id: _token(22),
    recorder_key_hash: 'secret',
    description: (config && config.description) || null,
  })

  return recorders.save(recorder)
}

export type UploadConfig = {
  recorder?: Recorder;
  creator?: Account;
  postprocessed?: boolean;
  transcription?: boolean;
}
function upload(config?: UploadConfig): Promise<Upload> {
  return ((config && config.recorder) ? Promise.resolve(config.recorder) : recorder())
  .then(function(recorder) {
    let upload = fake.upload(recorder, config && config.creator)

    if (config && config.postprocessed) {
      upload.uploaded = Date.now() - 1000
      upload.duration = 4
      upload.postprocessed = Date.now()
    }

    return uploads.save(upload)
      .then(function(upload) {
        if (!(config && config.transcription)) {
          return upload
        }

        let tx = domain.newTranscription({
          upload: upload,
          confidence: 0.777,
          language: 'en-US',
          text: 'fake test transcription',
          ip_address: '127.0.0.1',
          api_key: 'abc123',
        })

        return transcriptions.save(tx)
          .then(function(tx) {
            upload.transcrption = tx
            return upload
          })
      })
  })
}

type accountConfig = {
  verification_source?: string;
}
function account(config?: accountConfig): Promise<Account> {
  return accounts.save(fake.account(config && config.verification_source));
};

//link a recorder and account and add a gcm token to the recorder
export type ReceiverConfig = {
  account?: Account;
  client: 'iOS'|'android';
  state: 'good'|'bad'|'old';
}
function receiver(config?: ReceiverConfig): Promise<{recorder: Recorder, account: Account}> {
  let token = _token(64)
  let client = (config && config.client) || 'android'
  let state = (config && config.state) || 'good'
  let recorderConfig = {
    api_key: client === 'android' ? ANDROID_API_KEY : IOS_API_KEY,
  }

  gcmMocks[state](token)

  return Promise.all([
    config && config.recorder ? Promise.resolve(config.recorder) : recorder(recorderConfig),
    config && config.account ? Promise.resolve(config.account) : account(),
  ])
  .then(function(results) {
    let recorder = results[0]
    let account = results[1]

    //flow happy
    if (!account.account_id) throw new Error('missing account_id')

    return Promise.all([
      accounts.link(recorder.recorder_id, account.account_id),
      recorders.updateGCMToken(recorder.client_id, token),
    ])
    .then(function() {
      recorder.gcm_registration_token = token

      return {
        recorder: recorder,
        account: account,
      }
    })
  })
}

//create a single message
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

    return Messages.save(msg)
  })
}

//creates a given number of messages over the past month
type messageConfig = {
  sender?: Account;
  recipient?: Account;
  handled_count: number;
  read_count: number;
}
function messages(options: messageConfig): Promise<Message[]> {
  let count = Math.max(options.handled_count || 0, options.read_count || 0)
  let configs = []
  const MONTH = 1000 * 60 * 60 * 24 * 30
  let start = Date.now() - MONTH

  for (let i = 0; i < count; i++) {
    configs.push(message({
      sender: options.sender,
      recipient: options.recipient,
      handled: i < options.handled_count,
      read: i < options.read_count,
      created: Date.now() - Math.round((Math.random() * MONTH)),
    }))
  }

  return Promise.all(configs)
}

//wrap jwt.creds to provide a single point of update for running tests in
//different environments
function jwt(accountID?: string, recorderID?: string): string {
  return _jwt.creds(accountID, recorderID)
}

export default {
  API_KEY,
  UPLOAD_KEY,
  recorder,
  upload,
  account,
  receiver,
  message,
  messages,
  jwt,
}
