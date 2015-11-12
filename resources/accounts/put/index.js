var tv4 = require('tv4');
var _ = require('utils');
var schema = _.bodySchema(require('./spec').parameters);

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);

  if (jwt.err) {
    reply.fail(jwt.err.toString());
    return;
  }
  if (!jwt.email) {
    reply.fail('Unauthorized: jwt must contain email');
    return;
  }
  if (!tv4.validate(request.body, schema)) {
    reply.fail('Bad Request: ' + tv4.error);
    return;
  }

  var password = request.body.u.password;

  _.bcryptHash(password)
    .then(function(hash) {
      _.dynamo.updateItem({
        TableName: 'accounts',
        Key: {
          email: {S: jwt.email},
        },
        AttributeUpdates: {
          password: {Value: {S: hash}},
        },
      }, function(err, data) {
        if (err) {
          console.log(err);
          reply.fail('Internal Server Error');
          return;
        }
        reply.succeed();
      });
    })
    .catch(function(err) {
      console.log(err);
      reply.fail('Internal Server Error');
    });
};
