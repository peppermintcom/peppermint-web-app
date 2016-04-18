// @flow
import token from '../utils/randomtoken'
import _ from './utils'

var ErrNotFound = new Error('entity not found');

//milliseoncds since the epoch
export type Timestamp = number;

export type Entity = Message | Upload | Account;

export type Recorder = {
  recorder_id: string;
  client_id?: string;
  api_key?: string;
  recorder_key_hash?: string;
  registered?: Timestamp;
  description?: ?string;
  gcm_registration_token?: ?string;
}

export type RecorderParts = {
  api_key: string;
  client_id?: string;
  recorder_key_hash: string;
  description?: string;
}

//newRecorder adds a unique recorder_id, a registered timestamp, and a client_id
//if missing.
function newRecorder(r: RecorderParts): Recorder {
  return {
    recorder_id: token(22),
    registered: Date.now(),
    client_id: r.client_id || token(22),
    recorder_key_hash: r.recorder_key_hash,
    api_key: r.api_key,
    description: r.description || null,
    gcm_registration_token: null,
  };
}

function makeRecorder(r: Recorder): Recorder {
  return r;
}

export type ContentType = 'audio/mpeg' | 'audio/mp3' | 'audio/mp4';

export type Upload = {
  upload_id: string;
  recorder: Recorder;
  content_type: ContentType;
  //initialized is set in the upload factory
  initialized?: Timestamp;
  //uploaded, duration, and postprocessed are set in the postprocessing lambda
  //routine so they will be null if the upload is in progress or abandoned
  uploaded?: ?Timestamp;
  duration?: ?number;
  postprocessed?: ?Timestamp;
  transcription?: ?Transcription;
  //uploads can be created without an account
  creator?: ?Account;
  messages?: Message[];
  pathname: () => string;
}

export type UploadParts = {
  recorder: Recorder;
  creator: ?Account;
  content_type: ContentType;
}

var uploadProto = (function() {
  var extensions = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.m4a',
  };

  return {
    pathname: function() {
      return _.encodePathname({
        id: this.upload_id,
        recorder_id: this.recorder.recorder_id,
        content_type: this.content_type,
      });
    },
  };
})();

function newUpload(u: UploadParts): Upload {
  var upload = Object.create(uploadProto);

  upload.upload_id = token(22);
  upload.content_type = u.content_type;
  upload.recorder = u.recorder;
  upload.initialized = Date.now();
  upload.creator = u.creator;
  upload.uploaded = null;
  upload.duration = null;
  upload.postprocessed = null;
  upload.transcription = null;
  upload.messages = [];

  return upload;
}

function makeUpload(u: Object): Upload {
  return Object.assign(Object.create(uploadProto), u);
}

export type Transcription = {
  upload: Upload;
  text: string;
  confidence?: number;
  language?: string;
}

export type TranscriptionParts = {
  confidence?: number;
  language?: string;
  text: string;
  upload: Upload;
}

function newTranscription(t: TranscriptionParts): Transcription {
  return t;
}

function makeTranscription(t: Transcription): Transcription {
  return t;
}

export type Message = {
  upload: Upload;
  message_id: string;
  created: Timestamp;
  recipient: Account;
  sender: Account;
  handled: ?Timestamp;
  handled_by: ?string;
  outcome: ?string;
  read: ?Timestamp;
}

export type MessageParts = {
  upload: Upload;
  recipient: Account,
  sender: Account,
};

//newMessage adds message_id and created properties and returns a Message.
function newMessage(m: MessageParts): Message {
  return {
    upload: m.upload,
    message_id: token(22),
    created: Date.now(),
    recipient: m.recipient,
    sender: m.sender,
    handled: null,
    handled_by: null,
    outcome: null,
    read: null,
  };
}

function makeMessage(m: Message): Message {
  return m;
}

export type Account = {
  account_id?: string;
  email?: string;
  full_name?: string;
  pass_hash?: string;
  registered?: Timestamp;
  verified?: ?Timestamp;
  verification_source?: ?string;
}

//AccountParts is the data required for newAccount.
export type AccountParts = {
  email: string;
  pass_hash: string;
  full_name: string;
  verification_source: ?string;
}

//newAccount adds a unique account_id and a registered timestamp. If the email
//is already verified - e.g. if email was confirmed by Google - it also sets the
//verified timestamp.
function newAccount(a: AccountParts): Account {
  return {
    account_id: token(22),
    email: a.email.toLowerCase(),
    full_name: a.full_name,
    pass_hash: a.pass_hash,
    registered: Date.now(),
    verification_source: a.verification_source,
    verified: a.verification_source ? Date.now() : null,
  };
}

function makeAccount(a: Account): Account {
  return a;
}

module.exports = {
  ErrNotFound,
  newUpload,
  makeUpload,
  newRecorder,
  makeRecorder,
  newAccount,
  makeAccount,
  newTranscription,
  makeTranscription,
  newMessage,
  makeMessage,
};
