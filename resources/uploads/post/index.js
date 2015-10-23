var aws = require('aws-sdk');
var tv4 = require('tv4');
var _ = require('utils');
var conf = require('utils/conf');
var bodySchema = _.bodySchema(require('./spec').parameters);

const BUCKET = 'peppermint-cdn';

var s3 = new aws.S3({
    apiVersion: '2006-03-01',
    accessKeyId: conf.AWS_SIGNER_ID,
    secretAccessKey: conf.AWS_SIGNER_SECRET,
  });

exports.handler = function(req, res) {
  var jwt = _.authenticate(req.Authorization);
  if (jwt.err) {
    res.fail('Unauthorized');
    return;
  }

  var isValid = tv4.validate(req.body, bodySchema);
  if (!isValid) {
    res.fail(['Bad Request:', tv4.error.message].join(' '));
    return;
  }

  var key = [jwt.recorder_id, _.token(22)].join('/');

  s3.getSignedUrl('putObject', {
    Bucket: BUCKET,
    Key: key,
    ContentType: req.body.content_type,
  }, function(err, url) {
    if (err) {
      res.fail(err);
      return;
    }
    res.succeed({
      signed_url: url,
    });
  });
};
