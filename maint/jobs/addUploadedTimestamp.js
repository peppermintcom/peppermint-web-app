var csp = require('js-csp');
var _ = require('./utils');

var source = _.fileSource('sound-uploads-2016-03-28T0355.txt');
var uploads = _.mapChan(_.uploads.csv.decode, source);
var notUploaded = csp.operations.filterFrom(function(upload) {
  return !upload.uploaded;
}, uploads);

var incomplete = csp.chan();

csp.go(function*() {
  var upload;

  while ((upload = yield notUploaded) != csp.CLOSED) {
    var ok = yield isOnS3(upload);

    if (_.isError(ok)) {
      console.log(ok);
      continue;
    }
    if (!ok) {
      yield csp.put(incomplete, _.uploads.csv.encode(upload));
      continue;
    }
    if (ok) {
      yield addUploadedTimestamp(upload);
    }
  }
});

_.fileSink(_.filenames('uploads').incomplete, incomplete);

function isOnS3(upload) {
  var done = csp.chan();

  request({
    url: 'http://go.peppermint.com/' + upload.pathname,
    method: 'HEAD',
  }, function(err, res) {
    if (err) {
      csp.putAsync(done, err);
      done.close();
      return;
    }
    if (res.statusCode === 200) {
      csp.putAsync(done, true);
    } else {
      csp.putAsync(done, false);
    }
    done.close();
  });

  return done;
}

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
