/*
 * Uploads all operation handlers to AWS Lambda.
 */
var fs = require('fs');
var path = require('path');
var spawnSync = require('child_process').spawnSync;
var _ = require('lodash');
var through2 = require('through2');
var aws = require('aws-sdk');
var devDeps = require('../package.json').devDependencies;

var lambda = new aws.Lambda({
  apiVersion: '2015-03-31',
  region: 'us-west-2',
});

//node_modules dependencies that should not be zipped for upload to lambda
var blacklist = Object.keys(devDeps).concat([
  '.bin',
]);
//individual files in operation directories that should not be zipped for upload
var nozip = [
  'lambda.zip',
  'spec.js',
];

module.exports = function() {
  //include all node_modules in the zip except devDependencies and blacklisted
  var nodeModules = fs.readdirSync(path.join(__dirname, '../node_modules'));
  var deps = _.difference(nodeModules, blacklist)
    .map(function(name) {
      return 'node_modules/' + name + '/';
    });

  return through2.obj(function(file, enc, cb) {
    var dest = path.join(file.base, 'lambda.zip');
    var include = _.difference(fs.readdirSync(file.base), nozip)
      .map(function(file) {
        //TODO
        return 'resources/recorder/post/' + file;
      });
    var args = ['-rFS', dest].concat(deps).concat(include);

    spawnSync('zip', args);
    lambda.createFunction({
      Code: {
        ZipFile: fs.readFileSync(dest),
      },
      FunctionName: 'CreateRecorder',
      //TODO
      Handler: 'resources/recorder/post/index.handler',
      Role: 'arn:aws:iam::290766561564:role/LambdaExec',
      Runtime: 'nodejs',
      Publish: true,
    }, function(err, data) {
      //TODO get the FunctionArn from data for swagger spec
      console.log(err, data);
      cb();
    });
  });
};
