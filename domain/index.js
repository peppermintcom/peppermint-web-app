// @flow
import uuid from '../utils/uuid'
import timestamp from '../utils/timestamp'
import _ from './utils'

//depreacted - use messages
var ErrNotFound = new Error('Entity not found.');
var ErrAPIKey = new Error('Unknown API key.');
var ErrConflict = new Error('Conflict with existing entity.');

//error messages
var ErrForbidden = 'Authenticated user may not perform the requested action.'
var ErrNotFoundMessage = 'Entity not found.' //deprecated - use ErrNoEntity
var ErrNoEntity = 'Entity not found.'

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

let recorderProto = {
  //never include recorder_key
  resource: function() {
    let attrs: Object = {}

    if (this.client_id) {
      attrs.recorder_client_id = this.client_id
    }
    if (this.recorder_ts) {
      attrs.recorder_ts = timestamp(this.recorder_ts)
    }
    if (this.description) {
      attrs.description = this.description
    }
    if (this.gcm_registration_token) {
      attrs.gcm_registration_token = this.gcm_registration_token
    }

    return {
      type: 'recorders',
      id: this.recorder_id,
      attributes: attrs,
    }
  }
};
export type RecorderParts = {
  api_key: string;
  client_id: string;
  recorder_key_hash: string;
  description: ?string;
}
//newRecorder adds a unique recorder_id, a registered timestamp, and a client_id
//if missing.
function newRecorder(r: RecorderParts): Recorder {
  return {
    recorder_id: uuid(),
    registered: Date.now(),
    client_id: r.client_id || uuid(),
    recorder_key_hash: r.recorder_key_hash,
    api_key: r.api_key,
    description: r.description || null,
    gcm_registration_token: null,
  };
}

function makeRecorder(r: Recorder): Recorder {
  return Object.assign(Object.create(recorderProto), r);
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

  upload.upload_id = uuid();
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
  audioURL: Function;
  resource: Function;
}

let messageProto = {
  audioURL: function() {
    return 'http://go.peppermint.com/' + this.upload.pathname();
  },
  resource: function() {
    let attrs: Object = {
      audio_url: this.audioURL(),
      sender_email: this.sender.email,
      sender_name: this.sender.full_name,
      recipient_email: this.recipient.email,
      created: timestamp(this.created),
    }

    if (this.upload.duration) {
      attrs.duration = this.upload.duration
    }

    if (this.upload.transcription) {
      attrs.transcription = this.upload.transcription.text
    }

    if (this.read) {
      attrs.read = timestamp(this.read)
    }

    return {
      type: 'messages',
      id: this.message_id,
      attributes: attrs,
    }
  }
};

export type MessageParts = {
  upload: Upload;
  recipient: Account,
  sender: Account,
};

//newMessage adds message_id and created properties and returns a Message.
function newMessage(m: MessageParts): Message {
  let message: Object = Object.create(messageProto)

  message.message_id = uuid()
  message.upload = m.upload
  message.created = Date.now()
  message.recipient = m.recipient
  message.sender = m.sender
  message.handled = null
  message.handled_by = null
  message.outcome = null
  message.read = null

  return message
}

function makeMessage(m: Object): Message {
  return Object.assign(Object.create(messageProto), m);
}

export type Account = {
  account_id?: string;
  email?: string;
  full_name?: string;
  pass_hash?: ?string;
  registered?: Timestamp;
  verified?: ?Timestamp;
  verification_source?: ?string;
  highwater?: ?Timestamp;
  resource: Function;
}

let accountProto = {
  resource: function() {
    return {
      type: 'accounts',
      id: this.account_id,
      attributes: {
        email: this.email,
        full_name: this.full_name,
        registration_ts: timestamp(this.registration_ts),
        is_verified: !!this.verified,
      },
    }
  }
}

//AccountParts is the data required for newAccount.
export type AccountParts = {
  email: string;
  pass_hash?: string;
  full_name: string;
  verification_source: ?string;
}

//newAccount adds a unique account_id and a registered timestamp. If the email
//is already verified - e.g. if email was confirmed by Google - it also sets the
//verified timestamp.
function newAccount(a: AccountParts): Account {
  let account: Account = Object.create(accountProto)

  account.account_id = uuid()
  account.email = a.email.toLowerCase()
  account.full_name = a.full_name
  account.pass_hash = a.pass_hash || null
  account.registered = Date.now()
  account.verification_source = a.verification_source
  account.verified = a.verification_source ? Date.now() : null
  account.highwater = Date.now()

  return account
}

function makeAccount(a: Object): Account {
  return Object.assign(Object.create(accountProto), a);
}

export default {
  ErrNotFound,
  ErrAPIKey,
  ErrConflict,

  ErrForbidden,
  ErrNotFoundMessage,
  ErrNoEntity,

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
}
