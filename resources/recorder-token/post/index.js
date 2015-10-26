var _ = require('utils');

exports.handler = function(request, reply) {
  var auth = (request.Authorization || '').trim().split(' ');

  if (auth.length !== 2 || auth[0] !== 'Basic') {
    reply.fail('Unauthorized: Authorization header for Basic access authentication is required');
    return;
  }

  //get clientID and clientKey from Authorization header
  var credentials = new Buffer(auth[1], 'base64').toString('utf8').split(':');
  var user = credentials[0];
  var pass = credentials[1];

  //get recorder from dynamo
  _.dynamo.getItem({
    Key: {
      client_id: {S: user},
    },
    TableName: 'recorders',
  }, function(err, data) {
    if (err) {
      console.log(err);
      reply.fail('Internal Server Error');
      return;
    }
    if (!data.Item) {
      reply.fail('Unauthorized: unknown recorder_client_id');
      return;
    }
    //check the key
    _.bcryptCheck(pass, data.Item.recorder_key.S)
    .then(function(ok) {
      if (!ok) {
        reply.fail('Unauthorized: incorrect recorder_key');
        return;
      }
      reply.succeed({
        at: _.jwt(null, data.Item.recorder_id.S),
        recorder: {
          recorder_id: data.Item.recorder_id.S,
          recorder_client_id: user,
          description: data.Item.description && data.Item.description.S,
          recorder_ts: _.timestamp(new Date(parseInt(data.Item.recorder_ts.N))),
        },
      });
    })
    .catch(function(err) {
      console.log(err);
      reply.fail('Internal Server Error');
      return;
    });
  });
};
