var execSync = require('child_process').execSync;
var fs = require('fs');

const API_ID = process.env.PEPPERMINT_API_ID;
const STAGE = 'prod';

module.exports = function() {
  process.chdir('build/aws-apigateway-swagger-importer');
  execSync('./aws-api-import.sh --update ' + API_ID + ' --deploy ' + STAGE + ' ../../swagger.json');
};
