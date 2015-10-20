var url = require('url');
var _ = require('utils');

exports.handler = function(request, reply) {
  var parts = url.parse(request.signed_url);  

  reply.succeed({
    canonical_url: url.format(_.omit(parts, ['search', 'query']))
  }); 
};
