type TranscriptionItem = {
  transcription_id: S;
  recorder_id: S;
  text: S;
  audio_url: S;
  api_key?: S;
  confidence?: N;
  ip_address?: S;
  language?: S;
  timestamp?: N;
}

import dynamo from './client'
import domain from '../../domain'
import domainUtils from '../../domain/utils'
import _ from './utils'

//save puts the transcription in dynamo and resolves to the unmodified input.
function save(transcription: Transcription): Promise<Transcription> {
  return new Promise(function(resolve, reject) {
    dynamo.putItem({
      TableName: 'transcriptions',
      Item: format(transcription),
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(transcription);
    })
  })
}

//read resolves to the parsed transcription item or throws an error if not
//found.
function read(id: string): Promise<Transcription> {
  return new Promise(function(resolve, reject) {
    dynamo.getItem({
      TableName: 'transcriptions',
      Key: {
        transcription_id: {S: id},
      },
      ConsistentRead: true,
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (!data || !data.Item) {
        reject(domain.ErrNotFound);
        return;
      }
      resolve(parse(data.Item));
    });
  });
}

function readNull(id: string): Promise<?Transcription> {
  return read(id).catch(_.nullOK)
}

//discard deletes the transcription from dynamo and resolves.
function discard(id: string): Promise<void> {
  return new Promise(function(resolve, reject) {
    dynamo.deleteItem({
      TableName: 'transcriptions',
      Key: {
        transcription_id: {S: id},
      },
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function format(t: Transcription): TranscriptionItem {
  let item = {
    transcription_id: {S: t.upload.upload_id},
    text: {S: t.text},
    recorder_id: {S: t.upload.recorder.recorder_id},
    audio_url: {S: 'http://go.peppermint.com/' + t.upload.pathname()},
  }

  if (t.confidence) {
    item.confidence = {N: t.confidence.toString()}
  }
  if (t.language) {
    item.language = {S: t.language}
  }
  if (t.ip_address) {
    item.ip_address = {S: t.ip_address}
  }
  if (t.timestamp) {
    item.timestamp = {N: t.timestamp.toString()}
  }

  return item
}

//parse converts from a dyanmo transcriptions table item to a Transcription.
function parse(item: TranscriptionItem): Transcription {
  let parts = domainUtils.decodePathname(item.audio_url.S);
  let r: Recorder = domain.makeRecorder({
    recorder_id: parts.recorder_id,
  })
  let u: Upload = domain.makeUpload({
    upload_id: parts.id,
    content_type: parts.content_type,
    recorder: r,
  })

  return domain.makeTranscription({
    upload: u,
    text: item.text.S,
    api_key: item.api_key ? item.api_key.S : null,
    confidence: item.confidence ? +item.confidence.N : null,
    ip_address: item.ip_address ? item.ip_address.S : null,
    language: item.language ? item.language.S: null,
    timestamp: item.timestamp ? +item.timestamp.N : null,
  })
}

export default {
  read,
  readNull,
  save,
  discard,
}
