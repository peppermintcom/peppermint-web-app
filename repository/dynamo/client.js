var https = require('https')
var aws = require('aws-sdk');
var options = {apiVersion: '2012-08-10'};
var conf = require('../../utils/conf')

if (conf.NODE_ENV === 'development') {
  //dynamodb-local
  //we don't have a real database in us-east-1
  options.region = 'us-east-1';
  options.endpoint = 'http://localhost:8000';
} else if (conf.NODE_ENV === 'production') {
  //production dynamodb
  options.region = 'us-west-2';
  //Fix dynamo EPROTO error
  //https://github.com/aws/aws-sdk-js/issues/862#issuecomment-179416977
  //https://github.com/nodejs/node/issues/3692
  options.httpOptions = {
    agent: new https.Agent({
      rejectUnauthorized: true,
      keepAlive: true,
      secureProtocol: 'TLSv1_method',
      ciphers: 'ALL',
    }),
  };
  if (!process.env.LAMBDA_TASK_ROOT) {
    options.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});
  }
} else {
  throw new Error('NODE_ENV not set to "development" or "production"');
}

module.exports = new aws.DynamoDB(options);
