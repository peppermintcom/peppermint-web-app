var csp = require('js-csp');
var aws = require('aws-sdk');
var s3 = new aws.S3({apiVersion: '2006-03-01'});
var files = require('../files');
var _ = require('./utils');

//optimal for m3.medium in us-west-2
var WORKERS = 8;

var source = _.fileSource('sound-uploads-2016-03-28T0355.txt');
var uploads = _.mapChan(_.uploads.csv.decode, source);
var notUploaded = csp.operations.filterFrom(function(upload) {
  return !upload.uploaded;
}, uploads);

//not on S3
var incomplete = csp.chan();
//on S3 but no uploaded timestamp
var inconsistent = csp.chan();

for (var i = 0; i < WORKERS; i++) {
  csp.go(work);
}

function* work() {
  var upload;

  while ((upload = yield notUploaded) != csp.CLOSED) {
    var ok = yield files.exists(upload.pathname);

    if (_.isError(ok)) {
      console.log(ok);
      continue;
    }
    if (!ok) {
      yield csp.put(incomplete, _.uploads.csv.encode(upload));
      continue;
    }
    if (ok) {
       yield csp.put(inconsistent, _.uploads.csv.encode(upload));
      //yield addUploadedTimestamp(upload);
    }
  }
}

var filenames = _.filenames('upload');
_.fileSink(filenames.incomplete, incomplete);
_.fileSink(filenames.inconsistent, inconsistent);

function addUploadedTimestamp(upload) {
  var when = new Date(upload.created || '2015-01-01T00:00:01');
  var done = csp.chan();

  _.uploads.update(upload.pathname, 'SET uploaded = :when', {
    ':when': {N: when.valueOf().toString()},
  })
  .catch(function(err) {
    console.log(err);
    console.log(upload);
  })
  .then(function() {
    done.close();
  });

  return done;
}
