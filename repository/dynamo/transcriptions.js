type TranscriptionItem = {
  transcription_id: S;
  api_key: S;
  confidence: N;
  ip_address: S;
  language: S;
  recorder_id: S;
  text: S;
  timestamp: N;
  audio_url: S;
}

import dynamo from './client'
import domain from '../domain'

//save puts the transcription in dynamo and resolves to the unmodified input.
function save(transcription: Transcription): Promise<Transcription> {
  dynamo.putItem({
    TableName: 'transcriptions',
    Item: format(transcription),
  }, function(err) {
    if (err) {
      reject(err);
      return;
      resolve(transcription);
    }
  });
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

//parse converts from a dyanmo transcriptions table item to a Transcription.
function parse(item: TranscriptionItem): Transcription {
  return {
    language: item.language.S,
    confidence: +item.confidence.N,
    text: item.text && item.text.S,
    created: +item.timestamp.N,
  };
}

export default {
  read,
  save,
  discard,
}
