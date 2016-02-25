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
  if (request.recipient_id !== request.jwt.account_id) {
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
  var since = request.since ? _.parseTime(request.since).valueOf() : 0;

  if (_.isNaN(since)) {
    reply.fail({
      status: '400',
      detail: 'cannot parse since parameter',
    });
    return;
  }

  _.messages.query(request.recipient.email, since)
    .then(function(data) {
      if (data.LastEvaluatedKey) {
        request.last = +data.LastEvaluatedKey.created.N;
      }

      //add duration and transcription
      return Promise.all(_.map(data.Items, _.messages.expand))
        .then(function(messages) {
          request.messages = data.Items;
          reply.succeed(request);
        });
    })
    .catch(function(err) {
      reply.fail(err);
    });
}

function respond(request, reply) {
  var body = {
    data: _.map(request.messages, _.messages.resource),
  };

  if (request.last) {
    body.links = {
      next: 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/messages?recipient=' + request.recipient_id + '&since=' + encodeURIComponent(_.timestamp(request.last)),
    }
  }

  reply.succeed(body);
}
