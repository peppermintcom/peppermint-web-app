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
  includeTranscriptionAndDuration,
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
        console.log('sender not found: ' + request.body.data.attributes.sender_email);
        reply.fail({
          status: '404',
          detail: 'No account exists with sender_email',
        });
        return;
      }
      if (!request.recipient) {
        console.log('reicpient not found: ' + request.body.data.attributes.recipient_email);
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
        console.log('no recorders are related to recipient: ' + request.recipient.email);
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

function includeTranscriptionAndDuration(request, reply) {
  Promise.all([
      _.transcriptions.getByAudioURL(request.message.audio_url),
      _.uploads.getByURL(request.message.audio_url),
    ])
    .then(function(results) {
      var transcription = results[0];
      var upload = results[1];

      if (transcription) {
        request.message.transcription = transcription.text;
      }
      if (!upload) {
        reply.fail({
          status: '400',
          detail: 'No upload found at the audio_url',
        });
        return;
      }
      request.message.duration = upload.seconds;
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function deliver(request, reply) {
  Promise.all(_.map(request.recipient.receivers, function(recorder) {
    var formatter;

    if (_.apps.isAndroid(recorder.api_key)) {
      formatter = android;
    } else if (recorder.api_key === 'ios-dev') {
      formatter = iOSDev;
    } else {
      formatter = iOS;
    }

    var formats = formatter(request.message, recorder.gcm_registration_token, request.sender.full_name);
    
    return Promise.all(formats.map(function(m) {
      return _.gcm.send(m);
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
      console.log('no successes sending to gcm');
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
    duration: message.duration,
  };
}

function iOS(message, to, from_name) {
  return [{
    to: to,
    priority: 'high',
    content_available: true,
    data: data(message, from_name),
  }];
}

function iOSDev(message, to, from_name) {
  return [{
    to: to,
    priority: high,
    notification: {
      badge : "1",
      sound : "notification.aiff",
      body : "Message Content",
      title : "Message Title",
      click_action : "AudioMessage",
      sender_name: message.from_emai,
      sender_email: message.from_email,
      created: _.timestamp(message.created),
    },
    {
      to: to,
      priority: 'high',
      content_available: true,
      data: {
        recipient_email: message.recipient_email,
        audio_url: message.audio_url,
        sender_name: from_name,
        sender_email: message.from_email,
        created: _.timestamp(message.created),
        duration : message.duration,
        message_id : message.message_id,
      },
    },
  ];
}

function android(message, to, from_name) {
  return [{
    to: to,
    priority: 'high',
    data: data(message, from_name),
  }];
}
