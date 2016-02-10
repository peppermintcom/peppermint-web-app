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
    var formatter = _.apps.isAndroid(recorder.api_key) ? android : iOS;
    return _.gcm.send(formatter(request.message, recorder.gcm_registration_token, request.sender.full_name));
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

function data(message, from_name) {
  return {
    audio_url: message.audio_url,
    message_id: message.message_id,
    sender_name: from_name,
    sender_email: message.sender_email,
    recipient_email: message.recipient_email,
    created: _.timestamp(message.created),
    transcription: message.transcription,
  };
}

function iOS(message, to, from_name) {
  return {
    to: to,
    priority: 'high',
    content_available: true,
    notification: {
      title: 'New Message',
      body: from_name + ' sent you a message',
    },
    data: data(message, from_name),
  };
}

function android(message, to, from_name) {
  return {
    to: to,
    priority: 'high',
    data: data(message, from_name),
  };
}
