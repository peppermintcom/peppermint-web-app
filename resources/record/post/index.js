var url = require('url');
var tv4 = require('tv4');
var _ = require('utils');

var bodySchema = _.bodySchema(require('./spec').parameters);

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);
  if (jwt.err) {
   reply.fail('Unauthorized');
    return;
  }

  var isValid = tv4.validate(request.body, bodySchema);
  if (!isValid) {
    reply.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }

  var parts = url.parse(request.body.signed_url);

  reply.succeed({
    canonical_url: url.format(_.omit(parts, ['search', 'query']))
  }); 
};
