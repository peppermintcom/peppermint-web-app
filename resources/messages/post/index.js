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
  includeTranscription,
  deliver,
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

//create and save a message item to the database. Attaches a "message" property
//to the request.
function newMessage(request, reply) {
  _.messages.create(request.body.data.attributes)
    .then(function(message) {
      request.message = message;
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
};

function includeTranscription(request, reply) {
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
  Promise.all(_.map(request.recipient.receivers, function(recorder) {
    return _.gcm.send({
      to: recorder.gcm_registration_token,
      notification: {
        title: 'New Message',
        body: request.sender.full_name + ' sent you a message',
        icon: 'myicon',
      },
      data: {
        audio_url: request.message.audio_url,
        message_id: request.message.message_id,
        sender_name: request.sender.full_name,
        sender_email: request.message.sender_email,
        recipient_email: request.message.recipient_email,
        created: _.timestamp(request.message.created),
        transcription: request.message.transcription,
      },
    });
  }))
  .then(function(results) {
    var success = 0;

    return Promise.all(_.map(results, function(result, i) {
        success += result.success;
        return _.gcm.sync([request.recipient.receivers[i]], result);
      }))
      .then(function() {
        return success;
      });
  })
  .then(function(success) {
    if (success < 1) {
      reply.fail({
        status: '404',
        detail: 'Recipient cannot receive messages via Peppermint',
      });
      return;
    }
    reply.succeed(request);
  })
  .catch(function(err) {
    reply.fail(err);
  });
}

function respond(request, reply) {
  reply.succeed(_.messages.resource(request.message));
}
