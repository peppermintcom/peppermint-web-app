var tv4 = require('tv4');
var _ = require('utils');
var bodySchema = _.bodySchema(require('./spec').parameters);

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
  if (!_.apps[e.api_key]) {
    context.fail('Unauthorized: unknown api_key');
    return;
  }

  var recorderID = _.token(22);
  var clientID = e.recorder.recorder_client_id || _.token(22);
  var key = e.recorder.recorder_key || _.token(40);
  var desc = e.recorder.description;
  var ts = new Date();

  _.bcryptHash(key).then(function(hash) {
    var item = _.assign({
        recorder_id: {S: recorderID},
        client_id: {S: clientID},
        api_key: {S: e.api_key},
        recorder_key: {S: hash},
        recorder_ts: {N: ts.valueOf().toString()},
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
      var jwt = _.jwt.creds(null, recorderID);

      context.succeed({
        at: jwt,
        recorder: {
          recorder_id: recorderID,
          recorder_client_id: clientID,
          recorder_key: key,
          recorder_ts: _.timestamp(ts),
          description: desc,
        },
      });
    });
  })
  .catch(function(err) {
    console.log('unknown error');
    console.log(err);
    context.fail('Internal Server Error');
  });
};
