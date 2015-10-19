var aws = require('aws-sdk');
var _ = require('utils');

if (process.env.NODE_ENV === 'development') {
  aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});
}

var s3 = new aws.S3({apiVersion: '2006-03-01'});

const BUCKET = 'peppermint-cdn';

exports.handler = function(req, res) {
  var jwt = _.jwtVerify(req.jwt);
  if (jwt.err) {
    res.fail('Unauthorized');
    return;
  }

  var key = [_.hashID(jwt.recorder_id), _.token(22)].join('/');

  s3.getSignedUrl('putObject', {
    Bucket: BUCKET,
    Key: key,
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
