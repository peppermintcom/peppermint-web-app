//@flow
import type {Recorder, Upload, Account, Message} from '../domain'

import fs from 'fs'
import url from 'url'
import http from 'http'
import ffprobe from 'node-ffprobe/lib/ffprobe'
import push from '../utils/interapp'
import domain from '../domain'
import domainUtils from '../domain/utils'
import Accounts from '../repository/accounts'
import Uploads from '../repository/uploads'
import Messages from '../repository/messages'
import spec from '../resources/messages/post/spec'
import _ from './utils'

//so ffprobe is on the path
process.env.PATH += ':' + process.env.LAMBDA_TASK_ROOT + '/lambda';

export default _.use([
  [{fn: fetch, key: 'fetch_time'}],
  [{fn: probe, key: 'meta'}],
  [{fn: updateUpload, key: 'upload'}],
  [{fn: lookupPendingMessages, key: 'pendingMessages'}],
  [{fn: lookupRecipients, key: 'recipients'}],
  [{fn: lookupReceivers, key: 'receivers'}],
  [{fn: deliverPendingMessages, key: 'deliveries'}],
  [{fn: updateMessages}],
  [{fn: format, key: 'response'}],
], _.termLog)

//fetch gets the upload over public http, ensuring that all clients have access
//to the upload by the time this returns. It saves the upload to /tmp.
function fetch(state: Object): Promise<number> {
  let start = Date.now()

  return new Promise(function(resolve, reject) {
    //no backoff because it should be ready
    const timeout = 1000

    get()

    function get() {
      http.get(audioURL(state), (res) => {
        if (res.statusCode != 200) {
          setTimeout(get, timeout)
          return
        }
        let chunks = []
        res.on('data', function(chunk) {
          chunks.push(chunk)
        })
        res.on('end', function() {
          resolve(Buffer.concat(chunks))
        })
      })
    }
  })
  .then(function(body) {
    return new Promise(function(resolve, reject) {
      fs.writeFile(tmpPath(state), body, function(err) {
        if (err) {
          reject(err)
          return
        }
        resolve(Date.now() - start)
      })
    })
  })
}

//ffprobe
function probe(state: Object): Promise<Object> {
  return new Promise(function(resolve, reject) {
    ffprobe(tmpPath(state), function(err, meta) {
      if (err) {
        return reject(err);
      }
      resolve(meta)
    })
  })
}

//save duration and uploaded stamp to item in uploads table. Use start of main
//invocation instead of e.Records[0].eventTime in case clocks between S3 and
//lambda are different, we can still see how long processing took.
function updateUpload(state: Object): Promise<Upload> {
  return Uploads.update(key(state), {
    seconds: duration(state),
    uploaded: state.start,
    postprocessed: Date.now(),
  })
}

//lookup pending messages
function lookupPendingMessages(state: Object): Promise<Message[]> {
  return Promise.all(state.upload.pending_message_ids.map(Messages.read))
}

//lookup recipient account for each pending message
function lookupRecipients(state: Object): Promise<Account[]> {
  return Promise.all(state.pendingMessages.map((message) => (
    Accounts.read(message.recipient.email)
  )))
}

//lookup receivers for each recipient
//return type is Recorder[][], but that was rejected by flow
function lookupReceivers(state: Object): Promise<any> {
  return Promise.all(state.recipients.map((recipient) => (
    Accounts.receivers(recipient.account_id)
  )))
}

//deliver all pending_message_ids that were on the upload when the postprocessed
//timestamp was added to it.
function deliverPendingMessages(state: Object): Promise<?Object[]> {
  return Promise.all(state.pendingMessages.map((message, i) => {
    let receivers = state.receivers[i]

    if (!receivers.length) {
      return Promise.resolve(null)
    }
    //use full upload from state.upload, which includes transcription if it
    //exists
    message.upload = state.upload
    return push(receivers, message)
  }))
}

//save delivery results to message entities
//mutates pendingMessages items
function updateMessages(state: Object): Promise<void> {
  return Promise.all(state.pendingMessages.map((message, i) => {
    let delivery = state.deliveries[i]

    message.handled = Date.now()
    message.handled_by = 'lambda:Postprocess'
    message.outcome = 'GCM success count: ' + (delivery && delivery.success) || 0

    return Messages.save(message)
  }))
}

//not an API method, so reponse is dropped in production, but can be used to
//pass data to tests.
function format(state: Object): Promise<Object> {
  return Promise.resolve({
    messages: state.pendingMessages,
    deliveries: state.deliveries,
  })
}

//filesystem path where object will be stored locally
function tmpPath(state: Object): string {
  return '/tmp/' + key(state).split('/').pop()
}

//get duration from ffprobe analysis
function duration(state: Object): number {
  return Math.ceil(state.meta.format.duration)
}

//bucket associated with event
function bucket(state: Object): string {
  return state.Records[0].s3.bucket.name
}

//key associated with event
function key(state: Object): string {
  return state.Records[0].s3.object.key
}

//audio_url associated with event
function audioURL(state: Object): string {
  return 'http://go.peppermint.com/' + key(state)
}
