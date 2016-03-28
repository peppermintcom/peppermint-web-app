var csp = require('js-csp');
var _ = require('./utils');

var source = _.fileSource('sound-uploads-2016-03-28T0245.txt');
var uploads = _.mapChan(_.uploads.csv.decode, source);
var noCreated = csp.operations.filterFrom(function(upload) {
  return !upload.created;
}, uploads);

function createdTimestamp(upload) {
  var when = new Date('2015-01-01T00:00:00');

  _.uploads.update(upload.pathname, 'SET created = :now', {
    ':now': {N: when.valueOf().toString()},
  });
}
