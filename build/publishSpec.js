var fs = require('fs');
var aws = require('aws-sdk');
var s3 = new aws.S3();

module.exports = function(cb) {
  s3.putObject({
    Bucket: 'peppermint-assets',
    Key: 'swagger.json',
    ACL: 'public-read',
    Body: fs.readFileSync('./swagger.json'),
    CacheControl: 'max-age=60',
  }, cb);
};
