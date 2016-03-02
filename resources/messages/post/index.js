var spec = require('./spec');
var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.isjsonapi,
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  _.middleware.validateBody(spec),
  checkAccountAuth,
  lookupAccounts,
  allow,
  lookupRecipientReceivers,
  newMessage,
  getPostprocessResult,
  includeTranscription,
  deliver,
  saveMessage,
  respond,
]);

//ensure the auth token authenticates an account, not just a recorder
function checkAccountAuth(request, reply) {
  if (!request.jwt.account_id) {
    reply.fail({
      status: '401',
      detail: 'Auth token does not authenticate an account',
    });
    return;
  }
  reply.succeed(request);
}

//attach "sender" and "recipient" account objects to the request. Fails if
//either does not exist.
function lookupAccounts(request, reply) {
  Promise.all([
      _.accounts.get(request.body.data.attributes.sender_email),
      _.accounts.get(request.body.data.attributes.recipient_email),
    ])
    .then(function(accounts) {
      request.sender = accounts[0];
      request.recipient = accounts[1];

      if (!request.sender) {
        reply.fail({
          status: '404',
          detail: 'No account exists with sender_email',
        });
        return;
      }
      if (!request.recipient) {
        reply.fail({
          status: '404',
          detail: 'Recipient cannot receive messages via Peppermint',
        });
        return
      }

      reply.succeed(request);
    });
}

function allow(request, reply) {
  if (request.sender.account_id !== request.jwt.account_id) {
    reply.fail({
      status: '403',
      detail: 'Auth token is not valid for sender',
    });
    return;
  }
  reply.succeed(request);
}

//attach "receivers" array of recorders with registration_token to "request.recipient"
//property. Fails if there is not at least 1.
function lookupRecipientReceivers(request, reply) {
  _.receivers.recorders(request.recipient.account_id)
    .then(function(recorders) {
      var receivers = _.filter(recorders, function(r) {
        return !!r.gcm_registration_token;
      });
      if (!receivers.length) {
        reply.fail({
          status: '404',
          detail: 'Recipient cannot receive messages via Peppermint',
        });
        return;
      }
      request.recipient.receivers = receivers;
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

//create a message item and attach it to the request but do not save it to the
//database yet.
function newMessage(request, reply) {
  request.message = _.messages.create(_.assign({sender_name: request.sender.full_name}, request.body.data.attributes));
  reply.succeed(request);
}

//If the upload has been postprocessed get duration and add it
//to the message object and add a postprocessed flag to the request.
function getPostprocessResult(request, reply) {
  _.uploads.getByURL(request.message.audio_url)
    .then(function(upload) {
      if (!upload) {
        reply.fail({
          status: '400',
          detail: 'No upload found at the audio_url',
        });
        return;
      }
      if (upload.postprocessed) {
        request.postprocessed = true;
        request.message.duration = upload.seconds;
      }
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function includeTranscription(request, reply) {
  if (!request.postprocessed) {
    reply.succeed(request);
    return;
  }

  _.transcriptions.getByAudioURL(request.message.audio_url)
    .then(function(transcription) {
      if (transcription) {
        request.message.transcription = transcription.text;
      }
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function deliver(request, reply) {
  if (!request.postprocessed) {
    reply.succeed(request);
    return;
  }
  _.gcm.deliver(request.recipient.receivers, request.message)
    .then(function(successes) {
      if (successes < 1) {
        reply.fail({
          status: '404',
          detail: 'Recipient cannot receive messages via Peppermint',
        });
        return;
      }
      _.assign(request.message, {
        handled: Date.now(),
        handled_by: _.messages.handlers.CREATE_MESSAGE,
        outcome: 'GCM success count: ' + successes,
      });
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function saveMessage(request, reply) {
  //save whether delivered or not; will be sent by postprocessing function if
  //needed
  _.messages.put(request.message)
    .then(function() {
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function respond(request, reply) {
  reply.succeed({data: _.messages.resource(request.message)});
}
