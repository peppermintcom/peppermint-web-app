var fs = require('fs');
var path = require('path');
var spawnSync = require('child_process').spawnSync;
var gulp = require('gulp');
var _ = require('lodash');
var aws = require('aws-sdk');
var devDeps = require('../package.json').devDependencies;

const NAME = 'Postprocess';

aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});

var lambda = new aws.Lambda({
  apiVersion: '2015-03-31',
  region: 'us-west-2',
});

//production node_modules that should not be zipped for upload to lambda
var blacklist = Object.keys(devDeps).concat([
  '.bin',
  'aws-sdk',
]);

//individual files in operation directories that should not be zipped for upload
var nozip = [
  'lambda.zip',
  'gulpfile.js',
  'README.md',
  'sample.aac',
  'test',
  'ffmpeg',
];

gulp.task('zip', function() {
  //include all node_modules in the zip except devDependencies and blacklisted
  var nodeModules = fs.readdirSync(path.join(__dirname, '../node_modules'));
  var deps = _.difference(nodeModules, blacklist)
      .map(function(name) {
        return '../node_modules/' + name + '/';
      });
  var include = _.difference(fs.readdirSync('.'), nozip).filter(function(f) {
    return !/swp$/.test(f);
  });
  var args = ['-rFS', 'lambda.zip'].concat(deps).concat(include);

  spawnSync('zip', args);
});

gulp.task('update', function(cb) {
  var code = fs.readFileSync('./lambda.zip');

  lambda.updateFunctionCode({
    FunctionName: NAME,
    Publish: true,
    ZipFile: code,
  }, cb);
});
