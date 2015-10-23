var url = require('url');
var aws = require('aws-sdk');
var http = require('request');
var tv4 = require('tv4');
var _ = require('utils');

//# of characters in path of short urls
const KEY_LENGTH = 12;
const CDN_HOST = 'duw3fm6pm35xc.cloudfront.net';

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
  parts.host = CDN_HOST;
  var canonical = url.format(_.omit(parts, ['search', 'query']));
  var shortKey = _.token(KEY_LENGTH);

  //confirm the user who made the request owns the url
  var hashedRecorderID = _.hashID(jwt.recorder_id);
  var signedPathParts = parts.path.split('/');

  if (signedPathParts[1] !== hashedRecorderID) {
    console.log(hashedRecorderID + ' does not match ' + signedPathParts[1]);
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
    _.dynamo.putItem({
      Item: {
        key: {S: shortKey},
        pathname: {S: _.trimLeft(parts.pathname, '/')},
        created: {N: Date.now().toString()},
      },
      TableName: 'short-urls',
    }, function(err, data) {
      if (err) {
        console.log(err);
        reply.fail('Internal Server Error');
        return;
      }
      reply.succeed({
        canonical_url: canonical,
        short_url: 'https://peppermint.com/' + shortKey,
      });
    });
  });
};
