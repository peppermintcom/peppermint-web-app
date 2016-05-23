var aws = require('aws-sdk');

if (process.env.NODE_ENV === 'development') {
  aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});
}

var ses = new aws.SES({
  region: 'us-west-2',
  apiVersion: '2010-12-01',
})

module.exports = function(config) {
  return new Promise(function(resolve, reject) {
    ses.sendEmail({
      Destination: {
        ToAddresses: [config.to],
      },
      Message: {
        Body: {
          Html: {
            Data: config.html,
            Charset: 'utf8',
          },
          Text: {
            Data: config.text,
            Charset: 'utf8',
          },
        },
        Subject: {
          Data: config.subject,
          Charset: 'utf8',
        },
      },
      Source: config.from,
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};
