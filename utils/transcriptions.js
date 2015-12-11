var dynamo = require('./dynamo');

var BASE = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/transcriptions';
var AUDIO_ORIGIN = 'http://go.peppermint.com';

exports.get = function(transcriptionID) {
  return dynamo.get('transcriptions', {
    transcription_id: {S: transcriptionID},
  })
  .then(parse);
};

/**
 * save a transcription in the transcriptions table in dyanmo
 * @param {Object} transcription
 * @param {String} transcription.id
 * @param {String} transcription.recorderID
 * @param {String} transcription.language
 * @param {Number} transcription.confidence
 * @param {Date} transcription.ts
 * @param {String} transcription.ip
 * @param {String} transcription.api_key
 * @param {String} transcription.audio_url
 */
exports.put = function(transcription) {
  console.log(transcription);
  return dynamo.put('transcriptions', {
    transcription_id: {S: transcription.id},
    recorder_id: {S: transcription.recorderID},
    language: {S: transcription.language},
    confidence: {N: transcription.confidence.toString()},
    text: {S: transcription.text},
    timestamp: {N: transcription.ts.valueOf().toString()},
    ip_address: {S: transcription.ip},
    api_key: {S: transcription.api_key},
    audio_url: {S: transcription.audio_url},
  });
};

function parse(item) {
  if (!item) return null;

  return {
    transcription_url: transcriptionURL(item.transcription_id.S),
    language: item.language.S,
    confidence: +item.confidence.N,
    audio_url: audioURL(item.recorder_id.S, item.transcription_id.S),
    text: item.text.S,
    ip: item.ip_address.S,
    timestamp: +item.timestamp.N,
  };
}

function transcriptionURL(transcriptionID) {
  return [BASE, transcriptionID].join('/');
}

function audioURL(recorderID, transcriptionID) {
  return [AUDIO_ORIGIN, recorderID, transcriptionID].join('/');
}
