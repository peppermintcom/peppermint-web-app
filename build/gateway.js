var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

const API_ID = 'qdkkavugcd';
const STAGE = 'prod';

module.exports = function(cb) {
  process.chdir('build/aws-apigateway-swagger-importer');
  exec('./aws-api-import.sh --profile peppermint --update ' + API_ID + ' --deploy ' + STAGE + ' ../../swagger.json', function(err, stdout, stderr) {
    console.log(stdout.toString());
    console.log(stderr.toString());
    cb();
  });
};
