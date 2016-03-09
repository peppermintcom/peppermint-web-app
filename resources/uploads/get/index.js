var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  validate,
  query,
  attachTranscriptionText,
  respond,
]);

var SHORT_URL_RX = /^https\:\/\/peppermint\.com\/[\w-]{4,16}$/

function validate(request, reply) {
  if (!request.short_url || !SHORT_URL_RX.test(request.short_url)) {
    reply.fail({
      status: '400',
      detail: 'Invalid short_url query parameter',
    });
    return;
  }
  reply.succeed(request);
}

function query(request, reply) {
  _.uploads.resolve(request.short_url)
    .then(function(upload) {
      request.upload = upload;

      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function attachTranscriptionText(request, reply) {
  if (!request.upload) {
    reply.succeed(request);
    return;
  }
  _.transcriptions.getByPath(request.upload.pathname)
    .then(function(transcription) {
      if (transcription) {
        request.upload.transcription = transcription.text;
      }
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function respond(request, reply) {
  reply.succeed({
    data: _.compact([_.uploads.resource(request.upload)]),
  });
}
