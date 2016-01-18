var url = require('url');
var aws = require('aws-sdk');
var tv4 = require('tv4');
var _ = require('utils');
var conf = require('utils/conf');
var bodySchema = _.bodySchema(require('./spec').parameters);

var extensions = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
};

const BUCKET = 'peppermint-cdn';
const KEY_LENGTH = 12;
const CDN_HOST = 'go.peppermint.com';

var s3 = new aws.S3({
  apiVersion: '2006-03-01',
  accessKeyId: conf.AWS_SIGNER_ID,
  secretAccessKey: conf.AWS_SIGNER_SECRET,
});

exports.handler = function(req, res) {
  var jwt = _.authenticate(req.Authorization);
  if (jwt.err) {
    res.fail('Unauthorized: ' + jwt.err.toString());
    return;
  }
  if (!jwt.recorder_id) {
    res.fail('Unauthorized: recorder');
    return;
  }

  var isValid = tv4.validate(req.body, bodySchema);
  if (!isValid) {
    res.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }

  var extension = extensions[req.body.content_type] || '';
  var key = [jwt.recorder_id, _.token(22)].join('/') + extension;
  var uploadMeta = _.assign({
      pathname: {S: key},
    },
    req.body.sender_name ? {sender_name: {S: req.body.sender_name}} : {},
    req.body.sender_email ? {sender_email: {S: req.body.sender_email}}: {}
  );

  Promise.all([
      getSignedURL(key, req.body.content_type),
      getShortURL(key),
      _.dynamo.put('uploads', uploadMeta)
    ])
    .then(function(results) {
      var signedURL = results[0];
      var shortURL = results[1];
      var canonicalURL = url.format({
        protocol: 'http',
        host: CDN_HOST,
        pathname: '/' + key,
      });

      res.succeed({
        signed_url: signedURL,
        short_url: shortURL,
        canonical_url: canonicalURL,
      });
    })
    .catch(function(err) {
      reply.fail(err.toString());
    });
};

//Promise wrapper around s3.getSignedUrl
function getSignedURL(key, contentType) {
  return new Promise(function(resolve, reject) {
    s3.getSignedUrl('putObject', {
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }, function(err, signedURL) {
      if (err) {
        reject(err);
        return;
      }
      resolve(signedURL);
    });
  });
}

//Promise to map short_url to canonical_url in dynamo
function getShortURL(canonicalKey) {
  var shortKey = _.token(KEY_LENGTH);

  return _.dynamo.put('short-urls', {
      key: {S: shortKey},
      pathname: {S: canonicalKey},
      created: {N: Date.now().toString()},
    })
    .then(function() {
      return 'https://peppermint.com/' + shortKey;
    });
}
