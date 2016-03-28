var csp = require('js-csp');
var _ = require('./utils');

var source = _.fileSource('sound-uploads-2016-03-28T0355.txt');
var uploads = _.mapChan(_.uploads.csv.decode, source);
var noCreated = csp.operations.filterFrom(function(upload) {
  return !upload.created.valueOf();
}, uploads);

csp.go(function*() {
  var upload;

  while ((upload = yield noCreated) != csp.CLOSED) {
    console.log(upload.pathname);
    yield createdTimestamp(upload);
  }
});

function createdTimestamp(upload) {
  var when = new Date('2015-01-01T00:00:00');
  var done = csp.chan();

  _.uploads.update(upload.pathname, 'SET created = :when', {
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
