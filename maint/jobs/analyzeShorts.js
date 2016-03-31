var csp = require('js-csp');
var _ = require('../utils');
var parse = _.partial(_.mapChan, _.uploads.csv.decode);

var existentUploads = parse(_.fileSource('sound-uploads-2016-03-28T0355.txt'));
var nonexistentUploads = parse(_.fileSource('garbage-uploads-2016-03-28T0355.txt'));

var filenames = _.filenames('short-urls');

var sound = csp.chan();
var garbage = csp.chan();

csp.go(function*() {
  var existentPathnames = yield reduce(existentUploads);
  var nonexistentPathnames = yield reduce(nonexistentUploads);
  var isGarbage = _.partial(_.shortURLs.isGarbage, existentPathnames, nonexistentPathnames);

  var shorts = _.scan({
    TableName: 'short-urls',
    Limit: 1000,
  });


  var shortItem;

  while ((shortItem = yield shorts) != csp.CLOSED) {
    var toss = yield isGarbage(shortItem.pathname.S);

    if (yield isGarbage(shortItem.pathname.S) {
      yield csp.put(garbage, shortItem);
    } else {
      yield csp.put(sound, shortItem);
    }
  }
});

_.fileSink(filenames.garbage, _.mapChan(_.shortURLs.csv.encode, _.mapChan(_.shortURLs.parse, garbage)));
_.fileSink(filenames.sound, _.mapChan(_.shortURLs.csv.encode, _.mapChan(_.shortURLs.parse, sound)));

function reduce(source) {
  var done = csp.chan();
  var obj = {};

  csp.go(function*() {
    var u;

    while ((u = yield source) != csp.CLOSED) {
      obj[u.pathname] = true;
    }
    csp.putAsync(done, obj);
    done.close();
  });

  return done;
}
