var fs = require('fs');
var util = require('util');
var aws = require('aws-sdk');
var ffprobe = require('node-ffprobe');
var s3 = new aws.S3();
var _ = require('utils');

//add current directory to path so binaries uploaded in zip file can be found
process.env.PATH += ':' + process.env.LAMBDA_TASK_ROOT;

function main(e, context) {
  console.log(key(e));
  fetch(e)
    .then(saveTmp)
    .then(probe)
    .then(duration)
    .then(update)
    .then(function() {
      context.succeed();
    })
    .catch(function(err) {
      context.fail(err);
    });
}

function fetch(e) {
  return new Promise(function(resolve, reject) {
    s3.getObject({
      Bucket: bucket(e),
      Key: key(e),
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      e.data = data;
      resolve(e);
      return; 
    });
  });
}

//write object data from s3 to /tmp
function saveTmp(e) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(tmpPath(e), e.data.Body, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(e);
    });
  });
}

//filesystem path where object will be stored locally
function tmpPath(e) {
  return '/tmp/' + key(e).split('/').pop();
}

//bucket associated with event
function bucket(e) {
  return e.Records[0].s3.bucket.name;
}

//key associated with event
function key(e) {
  return e.Records[0].s3.object.key;
}

//get duration from ffprobe analysis
function duration(e) {
  e.duration = Math.ceil(e.meta.format.duration);
  return e;
}

//save duration and uploaded stamp to item in uploads table
function update(e) {
  return _.uploads.update(key(e), 'SET seconds = :seconds, uploaded = :now', {
    ':seconds': {N: e.duration.toString()},
    ':now': {N: Date.now().toString()},
  });
}

//ffprobe
function probe(e) {
  return new Promise(function(resolve, reject) {
    ffprobe(tmpPath(e), function(err, meta) {
      if (err) {
        reject(err);
        return;
      }
      e.meta = meta;
      resolve(e);
    });
  });
};

exports.handler = main;
