var aws = require('aws-sdk');

if (process.env.NODE_ENV === 'development') {
  aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});
}

module.exports = new aws.DynamoDB({
  apiVersion: '2012-08-10',
  region: 'us-west-2',
});
