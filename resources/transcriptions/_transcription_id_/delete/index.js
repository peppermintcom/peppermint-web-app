var _ = require('utils');
var spec = require('./spec');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  handle,
]);

//Only the uploader may delete a transcription.
function handle(request, reply) {
  if (!request.jwt.recorder_id) {
    reply.fail({
      status: '401',
      detail: 'Authorization header must authenticate recorder',
    });
    return;
  }

  _.transcriptions.get(request.transcription_id)
    .then(function(transcription) {
      if (!transcription) {
        reply.succeed();
        return;
      }
      if (transcription.recorder_id !== request.jwt.recorder_id) {
        reply.fail({
          status: '403',
          detail: 'Authorization header does not authenticate owner of transcription',
        });
        return;
      }
      return _.transcriptions.del(request.transcription_id)
        .then(function() {
          reply.succeed();
        });
    })
    .catch(function(err) {
      reply.fail(err);
    });
}
