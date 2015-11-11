var mandrill = require('mandrill-api');

module.exports = new mandrill.Mandrill(conf.PEPPERMINT_MANDRILL_KEY);
