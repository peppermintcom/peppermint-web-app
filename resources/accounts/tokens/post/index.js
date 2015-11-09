var _ = require('utils');

exports.handler = function(request, reply) {
  var auth = (request.Authorization || '').trim().split(' ');

  if (auth.length !== 2 || auth[0] !== 'Basic') {
    reply.fail('Unauthorized: Authorization header for Basic access authentication is required');
    return;
  }

  //get email and password from Authorization header
  var credentials = new Buffer(auth[1], 'base64').toString('utf8').split(':');
  var email = credentials[0];
  var pass = credentials[1];

  //get account from dynamo
  _.dynamo.getItem({
    Key: {
      email: {S: email},
    },
    TableName: 'accounts',
  }, function(err, data) {
    if (err) {
      console.log(err);
      reply.fail('Internal Server Error');
      return;
    }
    if (!data.Item) {
      reply.fail('Unauthorized: unknown email');
      return;
    }
    //check the key
    _.bcryptCheck(pass, data.Item.password.S)
      .then(function(ok) {
        if (!ok) {
          reply.fail('Unauthorized: incorrect password');
          return;
        }
        reply.succeed({
          at: _.jwt(data.Item.account_id.S),
          u: {
            email: data.Item.email.S,
            first_name: data.Item.first_name.S,
            last_name: data.Item.last_name.S,
            account_id: data.Item.account_id.S,
            registration_ts: _.timestamp(new Date(parseInt(data.Item.registration_ts.N))),
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
