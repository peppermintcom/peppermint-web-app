var _ = require('utils');

exports.handler = function(request, reply) {
  if (!_.apps[request.api_key]) {
    reply.fail('Unauthorized: unknown api_key');
    return;
  }

  _.transcriptions.get(request.transcription_id)
    .then(function(transcription) {
      if (!transcription) {
        reply.fail('Not Found');
        return;
      }
      delete transcription.transcription_id;
      delete transcription.recorder_id;
      reply.succeed(_.assign(transcription, {timestamp: _.timestamp(transcription.timestamp)}));
    })
    .catch(function(err) {
      reply.fail(err);
    });
};
