var url = require('url');
var _ = require('utils');

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);
  if (jwt.err) {
   reply.fail('Unauthorized');
    return;
  }

  var parts = url.parse(request.body.signed_url);  

  reply.succeed({
    canonical_url: url.format(_.omit(parts, ['search', 'query']))
  }); 
};
