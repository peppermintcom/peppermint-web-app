//@flow
import type {Upload, Recorder, Transcription} from '../domain'
import type {UpdateAttrs, UploadConditions} from './dynamo/uploads'

import url from 'url'
import domain from '../domain'
import domainUtils from '../domain/utils'
import uploads from './dynamo/uploads'
import transcriptions from './dynamo/transcriptions'

//read gets an upload and its transcription, if any, from dynamo. These are
//stored in separate tables in dynamo. If/when the transcriptions table is folded
//into the uploads table clients should be able to continue to use this routine.
function read(pathname: string): Promise<Upload> {
  return Promise.all([
      uploads.read(pathname),
      readTranscription(pathname),
    ])
    .then(function(results) {
      var upload: Upload = results[0];
      var transcription: ?Transcription = results[1];

      upload.transcription = transcription;
      return upload;
    });
}

function readTranscription(pathname: string): Promise<?Transcription> {
  return transcriptions.readNull(transcriptionID(pathname))
}

//transcriptionID computes the transcription_id from an upload.pathname. The
//second part of the pathname minus the file extension is the transcription_id.
function transcriptionID(pathname: string): string {
  return domainUtils.decodePathname(pathname).id
}

function addPendingMessageID(pathname: string, messageID: string): Promise<?Upload> {
  //can only be set on uploads that have not completed postprocessing
  return uploads.update(pathname, {
    messageID: messageID,
  }, {
    postprocessed: null,
  })
  .then(function(upload) {
    return readTranscription(upload.pathname())
      .then(function(tx) {
        upload.transcription = tx

        return upload
      })
  })
  .catch(function(err) {
    if (err.code == 'ConditionalCheckFailedException') {
      return null
    }
    //lambda seems to crash when throwing existing errors
    throw new Error(err.message)
  })
}

function update(pathname: string, attrs: UpdateAttrs, conditions: UploadConditions): Promise<Upload> {
  return Promise.all([
    uploads.update(pathname, attrs, conditions),
    readTranscription(pathname),
  ])
  .then(function(results) {
    let upload = results[0]
    let transcription = results[1]

    console.log(pathname)
    upload.transcription = transcription
    return upload
  })
}

module.exports = {
  read,
  readTranscription,
  save: uploads.save,
  addPendingMessageID,
  update,
};
