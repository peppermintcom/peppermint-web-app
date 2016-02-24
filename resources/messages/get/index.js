var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  validate,
  allow,
  lookupAccount,
  query,
  respond,
]);

function validate(request, reply) {
  if (!request.recipient_id) {
    reply.fail({
      status: '400',
      detail: 'recipient not specified',
    });
    return;
  }
  reply.succeed(request);
}

function allow(request, reply) {
  if (request.recipient_id !== request.jwt.recipient_id) {
    reply.fail({
      status: '403',
      detail: 'not authenticated as recipient',
    });
    return;
  }
  reply.succeed(request);
}

function lookupAccount(request, reply) {
  _.accounts.getByID(request.recipient_id)
    .then(function(account) {
      if (!account) {
        reply.fail({
          status: '400',
          detail: 'Recipient does not have an account',
        });
      }
      request.recipient = account;
      reply.succeed(request);
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function query(request, reply) {
  _.messages.query(request.recipient.email, request.since)
    .then(function(messages) {
      request.messages = messages;
    })
    .catch(function(err) {
      reply.fail(err);
    });
  });
}

function respond(request, reply) {
  reply.succeed({
    data: _.map(request.messages, _.messages.resource),
  });
}
