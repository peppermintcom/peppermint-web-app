var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

const API_ID = 'qdkkavugcd';
const STAGE = 'prod';

module.exports = function(cb) {
  process.chdir('build/aws-apigateway-swagger-importer');
  exec('./aws-api-import.sh --profile peppermint --update ' + API_ID + ' --deploy ' + STAGE + ' ../../swagger.json', function(err, stdout, stderr) {
    console.log(stdout.toString());
    //filter out SLF4J logging error messages
    var errors = stderr.toString().split('\n').filter(function(err) {
      return err && !/^SLF4J/.test(err);
    });
    console.log(errors.length ? errors.join('\n') : 'SUCCESS');
    cb();
  });
};
