var csp = require('js-csp');
var _ = require('./utils');
var shortURLs = require('../shortURLs');
var parse = _.partial(_.mapChan, _.uploads.csv.decode);

var existentUploads = parse(_.fileSource('sound-uploads-2016-03-28T0355.txt'));
var nonexistentUploads = parse(_.fileSource('garbage-uploads-2016-03-28T0355.txt'));

var filenames = _.filenames('short-urls');

var sound = csp.chan();
var garbage = csp.chan();

csp.go(function*() {
  var nonexistentPathnames = {};
  var existentPathnames = {};
  var isGarbage = _.partial(shortURLs.isGarbage, existentPathnames, nonexistentPathnames);

  yield reduce(nonexistentPathnames, nonexistentUploads);
  yield reduce(existentPathnames, existentUploads);

  var shorts = _.scan({
    TableName: 'short-urls',
    Limit: 1000,
  });


  var shortItem;
  var count = 0;

  while ((shortItem = yield shorts) != csp.CLOSED) {
    if (!_.shortURLs.isConsistent(shortItem)) {
      console.log(shortItem);
      continue;
    }
    var toss = yield isGarbage(shortItem.pathname.S);

    if (toss) {
      yield csp.put(garbage, shortItem);
    } else {
      yield csp.put(sound, shortItem);
    }
    count++;
    if (count % 10000 === 0) console.log(count);
  }
});

_.fileSink(filenames.garbage, _.mapChan(_.shortURLs.csv.encode, _.mapChan(_.shortURLs.parse, garbage)));
_.fileSink(filenames.sound, _.mapChan(_.shortURLs.csv.encode, _.mapChan(_.shortURLs.parse, sound)));

function reduce(obj, source) {
  var done = csp.chan();

  csp.go(function*() {
    var u;

    while ((u = yield source) != csp.CLOSED) {
      if (u && u.pathname) obj[u.pathname] = true;
    }
    done.close();
  });

  return done;
}
