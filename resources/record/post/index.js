var url = require('url');
var aws = require('aws-sdk');
var http = require('request');
var tv4 = require('tv4');
var _ = require('utils');

//# of characters in path of short urls
const CDN_HOST = 'go.peppermint.com';

var bodySchema = _.bodySchema(require('./spec').parameters);

exports.handler = function(request, reply) {
  var jwt = _.authenticate(request.Authorization);
  if (jwt.err) {
   reply.fail('Unauthorized: ' + jwt.err.toString());
    return;
  }

  var isValid = tv4.validate(request.body, bodySchema);
  if (!isValid) {
    reply.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }

  var parts = url.parse(request.body.signed_url);
  parts.host = CDN_HOST;
  parts.protocol = 'http';
  var canonicalKey = _.trimLeft(parts.pathname, '/');
  var canonical = url.format({
    protocol: 'http',
    host: CDN_HOST,
    pathname: canonicalKey,
  });

  //confirm the user who made the request owns the url
  var signedPathParts = parts.path.split('/');

  if (signedPathParts[1] !== jwt.recorder_id) {
    console.log(jwt.recorder_id + ' does not match ' + signedPathParts[1]);
    reply.fail('Forbidden');
    return;
  }

  http({
    method: 'HEAD',
    url: canonical,
  }, function(err, resp) {
    if (err) {
      console.log('Could not HEAD ' + canonical);
      reply.fail('Internal Server Error');
      return;
    }
    if (resp.statusCode === 403) {
      reply.fail('Not Found');
      return;
    }
    _.dynamo.fetch('short-urls', 'pathname-index', 'pathname', {S: canonicalKey})
      .then(function(items) {
        var item = items[0];
        if (!item) {
          throw new Error('Not Found');
        }
        reply.succeed({
          canonical_url: canonical,
          short_url: 'https://peppermint.com/' + item.key.S,
        });
      })
      .catch(function(err) {
        reply.fail(err.toString());
      });
  });
};
