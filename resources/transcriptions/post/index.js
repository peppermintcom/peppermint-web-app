var url = require('url');
var tv4 = require('tv4');
var bcp47 = require('bcp47');
var _ = require('utils');
var bodySchema = _.bodySchema(require('./spec').parameters);

var BASE = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/transcriptions';

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);

  if (jwt.err) {
    reply.fail('Unauthorized: ' + jwt.err.toString());
    return;
  }
  if (!_.apps[request.api_key]) {
    reply.fail('Unauthorized: unknown api_key');
    return;
  }
  if (!tv4.validate(request.body, bodySchema)) {
    if (/go\.peppermint\.com/.test(tv4.error.message)) {
      reply.fail('Bad Request: audio_url');
      return;
    }
    reply.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }
  if (!bcp47.parse(request.body.language)) {
    reply.fail('Bad Request: invalid language');
    return;
  }

  var ts = new Date();
  var audioURL = url.parse(request.body.audio_url);
  var pathItems = audioURL.pathname.split('/');

  if (pathItems.length !== 3) {
    reply.fail('Bad Request: audio_url');
    return;
  }
  if (jwt.recorder_id !== pathItems[1]) {
    reply.fail('Forbidden');
    return;
  }

  var recorderID = pathItems[1];
  var transcriptionID = pathItems[2].split('.')[0];

  return _.transcriptions.put({
      id: transcriptionID,
      recorderID: recorderID,
      language: request.body.language,
      confidence: request.body.confidence,
      text: request.body.text,
      ts: ts,
      ip: request.ip,
      api_key: request.api_key,
      audio_url: request.body.audio_url,
    })
    .then(function() {
      reply.succeed({
        transcription_url: [BASE, transcriptionID].join('/'),
        ip_address: request.ip,
        timestamp: _.timestamp(ts),
        audio_url: request.body.audio_url,
        recorder_id: recorderID,
        language: request.body.language,
        confidence: request.body.confidence,
        text: request.body.text,
      });
    })
    .catch(function(err) {
      reply.fail(err);
    });
};
