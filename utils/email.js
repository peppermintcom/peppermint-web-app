var emailjs = require('emailjs/email');

module.exports = emailjs.server.connect({
  user: process.env.PEPPERMINT_SES_SMTP_USER,
  password: process.env.PEPPERMINT_SES_SMTP_PASS,
  host: 'email-smtp.us-west-2.amazonaws.com',
  ssl: true,
});
