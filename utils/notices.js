var aws = require('aws-sdk');
var _ = require('lodash');

if (process.env.NODE_ENV === 'development') {
  aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});
}

var sns = new aws.SNS({
  apiVersion: '2010-03-31',
  region: 'us-west-2',
});

//topic ARNs
var GCM_WEIRD = 'arn:aws:sns:us-west-2:819923996052:GCM-unusual-responses';

//promise wrapper around sns.publish
function publish(topicARN, message, subject) {
  var params = {
    TopicArn: topicARN,
    Message: typeof message === 'object' ? JSON.stringify(message) : message,
  };

  if (subject) {
    params.Subject = subject.toString();
  }

  return new Promise(function(resolve, reject) {
    sns.publish(params, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

exports.gcmWeird = _.partial(publish, GCM_WEIRD);
