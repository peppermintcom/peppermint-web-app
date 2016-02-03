var _ = require('utils');

exports.handler = _.middleware.process([
  _.middleware.validateApiKey,
  validatePeppermintAuthHeader,
  handle,
  addReceiverRelationship,
]);

function validatePeppermintAuthHeader(request, reply) {
  if (!request.Authorization) {
    reply.fail({
      status: '401',
      detail: 'Authorization header required',
    });
    return;
  }
  if (!_.auth.isValid(request.Authorization)) {
    reply.fail({
      status: '400',
      detail: 'Authorization header does not follow Peppermint scheme',
    });
    return;
  }
  reply.succeed(request);
}

function handle(request, reply) {
  var creds = null;

  try {
    creds = _.auth.decode(request.Authorization);
  } catch(e) {
    reply.fail({
      status: '400',
      detail: 'Could not parse Authorization header',
    });
    return;
  }

  Promise.all([
    //recorder.user is the client_id, the key in the recorders table
    creds.recorder ? _.recorders.get(creds.recorder.user) : Promise.resolve(),
    //Auth header validation ensures at most one of account, google, or facebook
    creds.account ? _.accounts.get(creds.account.user) : Promise.resolve(),
    creds.google ? _.auth.google(creds.google).then(_.accounts.upsert) : Promise.resolve(),
    creds.facebook ? _.auth.facebook(creds.facebook).then(_.accounts.upser) : Promise.resolve(),
  ])
  .then(function(results) {
    var recorder = results[0];
    var account = results[1] || results[2] || results[3];

    if (creds.account && !account) {
      reply.fail({
        status: '404',
        detail: 'Account not found',
      });
      return;
    }
    if (creds.recorder && !recorder) {
      reply.fail({
        status: '404',
        detail: 'Recorder not found',
      });
      return;
    }

    return Promise.all([
      creds.account ? _.bcryptCheck(creds.account.password, account.password) : Promise.resolve(),
      creds.recorder ? _.bcryptCheck(creds.recorder.password, recorder.recorder_key) : Promise.resolve(),
    ])
    .then(function(results) {
      var accountOK = results[0];
      var recorderOK = results[1];

      if (accountOK === false) {
        reply.fail({
          status: '401',
          detail: 'account password',
        });
        return;
      }
      if (recorderOK === false) {
        reply.fail({
          status: '401',
          detail: 'recorder key',
        });
        return;
      }
      var id = _.uuid();
      var jwt = _.jwt.creds(account && account.account_id, recorder && recorder.recorder_id, id);
      var accountResource = _.accounts.resource(account);
      var recorderResource = _.recorders.resource(recorder);
      var relationships = _.assign({},
          accountResource ? {account: _.pick(accountResource, 'id', 'type')} : null,
          recorderResource ? {recorder: _.pick(recorderResource, 'id', 'type')} : null
      );

      if (recorderResource) {
        delete recorderResource.attributes.recorder_key;
      }

      reply.succeed({
        data: {
          type: 'jwts',
          id: id,
          attributes: {
            token: jwt,
          },
          relationships: relationships,
        },
        included: _.compact([accountResource, recorderResource]),
      });
    })
  })
  .catch(function(err) {
    console.log(err);
    reply.fail(err);
  });
}

function addReceiverRelationship(request, reply) {
  //check for a receiver relationship if jwt is valid for both an account and a
  //recorder
  if (request.included.length === 2) {
    var account = _.find(request.included, function(resource) {
      return resource.type === 'accounts';
    });
    var recorder = _.find(request.included, function(resource) {
      return resource.type === 'recorders';
    });

    _.receivers.get(recorder.id, account.id)
      .then(function(record) {
        if (record) {
          //will update resource object in included array by reference
          account.relationships = {
            receivers: {
              data: [{type: 'recorders', id: recorder.id}],
            }
          };
        }
        reply.succeed(request);
      })
      .catch(function(err) {
        reply.fail(err);
      });

    return;
  }
  reply.succeed(request);
}
