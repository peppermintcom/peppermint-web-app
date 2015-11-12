var _ = require('utils');

exports.handler = function(request, reply) {
  var jwt = _.jwt.decode(request.jwt);

  if (jwt.err) {
    reply.fail('Unauthorized: ' + jwt.err.toString());
    return;
  }

  _.dynamo.updateItem({
    TableName: 'accounts',
    Key: {
      email: {S: jwt.payload.sub},
    },
    AttributeUpdates: {
      verification_ts: {Value: {N: Date.now().toString()}},
      verification_ip: {Value: {S: request.ip}},
    },
  }, function(err, data) {
    if (err) {
      console.log(err);
      reply.fail('Dynamo error');
      return;
    }
    reply.succeed();
  });
};
