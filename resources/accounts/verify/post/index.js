var _ = require('utils');

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);

  if (jwt.err) {
    reply.fail('Unauthorized: ' + jwt.err.toString());
    return;
  }

  _.dynamo.query({
    TableName: 'accounts',
    IndexName: 'account_id-index',
    KeyConditionExpression: 'account_id = :account_id',
    ExpressionAttributeValues: {
      ':account_id': {S: jwt.account_id},
    },
  }, function(err, data) {
    if (err) {
      reply.fail(err);
      return;
    }
    if (data.Count !== 1) {
      console.log(data.Count);
      reply.fail('Internal Server Error');
      return;
    }

    _.accounts.verifyEmail(data.Items[0].email.S, data.Items[0].full_name.S)
      .then(function() {
        reply.succeed({});
      })
      .catch(function(err) {
        reply.fail(err);
      });
  });
};
