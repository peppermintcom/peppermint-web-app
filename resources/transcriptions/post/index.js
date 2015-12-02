var url = require('url');
var tv4 = require('tv4');
var bcp47 = require('bcp47');
var _ = require('utils');
var bodySchema = _.bodySchema(require('./spec').parameters);

var BASE = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/transcriptions';

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);

  if (jwt.err) {
    reply.fail('Unauthorized ' + jwt.err);
    return;
  }
  if (!_.apps[request.api_key]) {
    reply.fail('Unauthorized: unknown api_key');
    return;
  }
  if (!tv4.validate(request.body, bodySchema)) {
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

  _.dynamo.put('transcriptions', {
      recorder_id: {S: recorderID},
      transcription_id: {S: transcriptionID},
      language: {S: request.body.language},
      confidence: {N: request.body.confidence.toString()},
      text: {S: request.body.text},
      timestamp: {N: ts.valueOf().toString()},
      ip_address: {S: request.ip},
      api_key: {S: request.api_key},
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
