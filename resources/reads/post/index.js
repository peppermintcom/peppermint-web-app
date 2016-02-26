var spec = require('./spec');
var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.isjsonapi,
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  _.middleware.validateBody(spec),
  lookupAccount,
  stamp,
]);

function lookupAccount(request, reply) {
  if (!request.jwt.account_id) {
    reply.fail({
      status: '401',
      detail: 'Caller must be authenticated as message recipient',
    });
    return;
  }

  _.accounts.getByID(request.jwt.account_id).then(function(account) {
    if (!account) {
      reply.fail({
        status: '401',
        detail: 'Caller must be authenticated as message recipient',
      });
      return;
    }
    request.caller = account;
    reply.succeed(request);
  });
}

var CONDITION = 'attribute_exists(message_id) AND attribute_not_exists(#read) AND recipient_email = :recipient_email';

function stamp(request, reply) {
  var messageID = request.body.data.id;

  _.messages.update(messageID, 'SET #read = :now', {
      ':now': {N: Date.now().toString()},
      ':recipient_email': {S: request.caller.email},
    }, {
      '#read': 'read',
    }, CONDITION)
    .then(function() {
      reply.succeed();
    })
    .catch(function(err) {
      if (!_.dynamo.isConditionFailed(err)) {
        reply.fail(err);
      }

      //return a specific error depending on which of the conditions failed
      _.messages.get(messageID).then(function(message) {

        //not found
        if (!message) {
          reply.fail({
            status: '400',
            detail: 'Message not found',
          });
          return;
        }

        //forbidden
        if (message.recipient_email !== request.caller.email) {
          reply.fail({
            status: '403',
            detail: 'Authenticated user is not recipient of the specified message',
          });
          return;
        }

        //conflict
        if (message.read) {
          reply.succeed();
          return;
        }
      });
    });
}
