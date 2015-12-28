var emailjs = require('emailjs/email');
var conf = require('./conf.js');

module.exports = emailjs.server.connect({
  user: conf.PEPPERMINT_SES_SMTP_USER,
  password: conf.PEPPERMINT_SES_SMTP_PASS,
  host: 'email-smtp.us-west-2.amazonaws.com',
  ssl: true,
});
