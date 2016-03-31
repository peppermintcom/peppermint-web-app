var csp = require('js-csp');
var _ = require('../utils');

var source = _.fileSource('garbage-uploads-2016-03-28T0355.txt');
var uploads = _.mapChan(_.uploads.csv.decode, source);
var discard = _.partial(_.batchAndDiscard, 'uploads', function(upload) {
  return {pathname: {S: upload.pathname}};
});

//the source file contains only garbage so we do not need to filter it
var removed = discard(uploads);

_.stdout(removed.errors);
_.stdout(removed.ok);
