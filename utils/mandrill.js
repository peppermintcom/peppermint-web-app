var mandrill = require('mandrill-api');
var conf = require('./conf');

module.exports = new mandrill.Mandrill(conf.PEPPERMINT_MANDRILL_KEY);
