var spec = require('./spec');
var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.isjsonapi,
  _.middleware.validateApiKey,
  _.middleware.authenticate,
  _.middleware.validateBody(spec),
  lookupAccounts,
  allow,
  handle
]);

//fails if sender or recipient does not exist, or if recipient does not have a
//device group
function lookupAccounts(request, reply) {
  Promise.all([
      _.accounts.get(request.body.data.attributes.sender_email),
      _.accounts.get(request.body.data.attributes.recipient_email),
    ])
    .then(function(accounts) {
      request.sender = accounts[0];
      request.recipient = accounts[1];

      if (!request.sender) {
        //TODO local test
        reply.fail({
          status: '404',
          detail: 'No account exists with sender_email',
        });
        return;
      }
      if (!request.recipient || !request.recipient.gcm_notification_key) {
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

function handle(request, reply) {
  var msg = request.body.data.attributes;
  var resource;

  _.messages.create(msg)
    .then(function(message) {
      resource = _.messages.resource(message);
      message.created = resource.attributes.created;

      return _.gcm.sendToDeviceGroup({
        to: request.recipient.gcm_notification_key,
        data: message
      });
    })
    .then(function(result) {
      if (result.success > 0) {
        reply.succeed(resource);
        return;
      }
      //TODO clear failed registration_ids?
      //TODO local test
      reply.fail({
        status: '404',
        detail: 'Recipient cannot receive messages via Peppermint',
      });
    })
    .catch(function(err) {
      console.log(err.stack);
      reply.fail(err);
    });
}
