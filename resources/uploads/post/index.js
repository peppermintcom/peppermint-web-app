var aws = require('aws-sdk');
var _ = require('utils');
var conf = require('utils/conf');

const BUCKET = 'peppermint-cdn';

var s3 = new aws.S3({
    apiVersion: '2006-03-01',
    accessKeyId: conf.AWS_SIGNER_ID,
    secretAccessKey: conf.AWS_SIGNER_SECRET,
  });

exports.handler = function(req, res) {
  var auth = req.Authorization.split(' ');

  if (!auth || auth[0] !== 'Bearer' || !auth[1]) {
    //TODO 400
    res.fail('Unauthorized');
    return;
  }

  var jwt = _.jwtVerify(auth[1]);
  if (jwt.err) {
    res.fail('Unauthorized');
    return;
  }

  var key = [_.hashID(jwt.recorder_id), _.token(22)].join('/');

  s3.getSignedUrl('putObject', {
    Bucket: BUCKET,
    Key: key,
    ContentType: req.body.contentType,
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
