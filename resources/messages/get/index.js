var url = require('url');
var _ = require('utils');

//query by roles
var NONE = 0;
var RECIPIENT = 1;
var SENDER = 2;
var BOTH = RECIPIENT | SENDER;

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
  var role = NONE;

  if (request.recipient_id) role |= RECIPIENT;
  if (request.sender_id) role |= SENDER;

  if (role === NONE) {
    reply.fail({
      status: '400',
      detail: 'either recipient or sender must be specified',
    });
    return;
  }
  if (role === BOTH) {
    reply.fail({
      status: '400',
      detail: 'cannot query recipient and sender in the same call',
    });
    return;
  }
  request.role = role;
  reply.succeed(request);
}

function allow(request, reply) {
  if (request.jwt.account_id !== roleID(request)) {
    reply.fail({
      status: '403',
      detail: request.role === RECIPIENT ? 'not authenticated as recipient': 'not authenticated as sender',
    });
    return;
  }
  reply.succeed(request);
}

function lookupAccount(request, reply) {
  _.accounts.getByID(request.jwt.account_id)
    .then(function(account) {
      if (!account) {
        //edge case were the account was deleted since the JWT was created
        reply.fail({
          status: '400',
          detail: request.role === RECIPIENT ? 'Recipient does not have an account' : 'Sender does not have an account',
        });
      }
      request.caller = account;
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

  var query = request.role === RECIPIENT ? _.messages.queryRecipient : _.messages.querySender;

  query(request.caller.email, since)
    .then(function(data) {
      if (data.cursor) {
        request.last = data.cursor;
      }

      //add duration and transcription
      return Promise.all(_.map(data.messages, _.messages.expand))
        .then(function(messages) {
          request.messages = messages
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
      next: next(request),
    }
  }

  reply.succeed(body);
}

function roleKey(request) {
  if (request.role === RECIPIENT) return 'recipient_id';
  if (request.role === SENDER) return 'sender_id';
}

//returns either request.recipient_id or request.sender_id depending on
//request.role
function roleID(request) {
  return request[roleKey(request)];
}

function next(request) {
  return url.format({
    protocol: 'https',
    host: 'qdkkavugcd.execute-api.us-west-2.amazonaws.com',
    pathname: '/prod/v1/messages',
    query: {
      since: _.timestamp(request.last),
      recipient: request.recipient_id,
      sender: request.sender_id,
    },
  });
}
