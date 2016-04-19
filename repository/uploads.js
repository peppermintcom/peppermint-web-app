//@flow
import type {Upload, Recorder, Transcription} from './domain'

import url from 'url'
import domain from './domain'
import uploads from './dynamo/uploads'
import transcriptions from './dynamo/transcriptions'


//read gets an upload and its transcription, if any, from dynamo. These are
//stored in separate tables in dynamo. If/when the transcriptions table is folded
//into the uploads table clients should be able to continue to use this routine.
function read(pathname: string): Promise<Upload> {
  return Promise.all([
      uploads.read(pathname),
      transcriptions.read(transcriptionID(pathname)).catch(function(err) {
        if (err === domain.ErrNotFound) {
          return null;
        }
        throw err
      }),
    ])
    .then(function(results) {
      var upload: Upload = results[0];
      var transcription: ?Transcription = results[1];

      upload.transcription = transcription;
      return upload;
    });
}

//transcriptionID computes the transcription_id from an upload.pathname. The
//second part of the pathname minus the file extension is the transcription_id.
function transcriptionID(pathname: string): string {
  var urlParts = url.parse(pathname);
  //make flow happy
  if (!urlParts.pathname) {
    return '';
  }
  var pathParts = urlParts.pathname.split('/');
  var filename = pathParts.pop();
  var fileParts = filename.split('.');

  return fileParts[0];
}

module.exports = {read};
