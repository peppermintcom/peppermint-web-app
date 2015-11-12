var _ = require('utils');

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);

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

    _.accounts.verifyEmail(data.Items[0].email.S)
      .then(function() {
        reply.succeed({});
      })
      .catch(function(err) {
        reply.fail(err);
      });
  });
};
