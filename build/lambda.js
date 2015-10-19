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

const EXEC_ROLE = 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole';

aws.config.credentials = new aws.SharedIniFileCredentials({profile: 'peppermint'});

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
];

module.exports = function() {
  //include all node_modules in the zip except devDependencies and blacklisted
  var nodeModules = fs.readdirSync(path.join(__dirname, '../node_modules'));
  var deps = _.difference(nodeModules, blacklist)
      .map(function(name) {
        return 'node_modules/' + name + '/';
      });
  var functions = new Promise(function(resolve, reject) {
    lambda.listFunctions({}, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(data.Functions.reduce(function(accm, fn) {
        accm[fn.FunctionName] = fn;
        return accm;
      }, {}));
    });
  });

  return through2.obj(function(file, enc, cb) {
    var relativeDir = path.relative(process.cwd(), file.base);
    console.log(relativeDir);
    var dest = path.join(relativeDir, 'lambda.zip');
    var include = _.difference(fs.readdirSync(relativeDir), nozip)
        .map(function(filename) {
          return path.join(relativeDir, filename);
        });
    var name = require('../' + relativeDir + '/spec').operationId;
    var args = ['-rFS', dest].concat(deps).concat(include);

    spawnSync('zip', args);
    var code = fs.readFileSync(path.join(relativeDir, 'lambda.zip'));

    functions
      .then(function(functions) {
        if (functions[name]) {
          update(name, code, cb);
        } else {
          create(name, code, relativeDir + '/index.handler', cb);
        }
      })
      .catch(cb);

  });
};

function create(name, code, handler, cb) {
  lambda.createFunction({
    Code: {
      ZipFile: code,
    },
    FunctionName: name,
    Handler: handler,
    Role: EXEC_ROLE,
    Runtime: 'nodejs',
    Publish: true,
    Timeout: 10,
  }, cb);
}

function update(name, code, cb) {
  lambda.updateFunctionCode({
    FunctionName: name,
    Publish: true,
    ZipFile: code,
  }, cb);
}
