var tv4 = require('tv4');
var _ = require('utils');
var bodySchema = _.bodySchema(require('./spec').parameters);

var apps = {
  'abc123': true,
};

/**
 * Registers a new instance of an app. The app can be identified by the API key
 * provided in the payload.
 */
exports.handler = function(e, context) {
  var isValid = tv4.validate(e, bodySchema);

  if (!isValid) {
    context.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }
  if (!apps[e.api_key]) {
    context.fail('Unauthorized: unknown api_key');
    return;
  }
  //generate key (password)
  var key = _.token(40);
  var uuid = _.token(22);
  var ts = new Date();
  var desc = e.recorder.description;

  _.bcryptHash(key).then(function(hash) {
    var item = _.assign({
        client_id: {S: e.recorder.recorder_client_id},
        uu_id: {S: uuid},
        api_key: {S: e.api_key},
        recorder_key: {S: hash},
        registration_ts: {N: ts.valueOf().toString()},
      },
      desc ? {description: {S: desc}} : {});

    _.dynamo.putItem({
      Item: item,
      TableName: 'recorders',
      ConditionExpression: 'attribute_not_exists(client_id)',
    }, function(err, data) {
      if (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          context.fail('Conflict: duplicate recorder_client_id');
          return;
        }
        console.log(err);
        context.fail('Internal Server Error');
        return;
      }
      //generate jwt with account_id and recorder_id
      var jwt = _.jwt(null, uuid);

      context.succeed({
        at: jwt,
        recorder: {
          recorder_id: uuid,
          recorder_client_id: e.recorder.recorder_client_id,
          recorder_key: key,
          recorder_ts: _.timestamp(ts),
          description: e.recorder.description,
        },
      });
    });
  })
  .catch(function(err) {
    console.log('unknown error');
    console.log(err);
    context.fail('Internal Server Error');
  });
        /*
        .catch(function(err) {
          if (err.code === '23505' && /recorder_client_id/.test(err.detail)) {
            context.fail('Conflict: recorder_client_id');
            return;
          }
          throw err;
        });
        */
};
