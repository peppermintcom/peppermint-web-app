var csp = require('js-csp');
var _ = require('../utils');

var source = _.fileSource('garbage-uploads-2016-03-28T0355.txt');
var uploads = _.mapChan(_.uploads.csv.decode, source);

csp.go(function*() {
  var upload;

  while ((upload = yield uploads) != csp.CLOSED) {
    yield removeUpload(upload);
  }
});

function removeUpload(upload) {
  var done = csp.chan();

  _.dynamo.del('uploads', {pathname: {S: upload.pathname}})
    .catch(function(err) {
      console.log(err);
    })
    .then(function() {
      done.close();
    });

  return done;
}
