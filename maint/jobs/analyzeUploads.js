//Scan over the entire uploads table and produce files of sound, inconsistent,
//and garbage uploads.
var fs = require('fs');
var csp = require('js-csp');
var uploads = require('../uploads');
var _ = require('./utils');

var filenames = _.filenames('uploads');

var source = uploads.source();
var sound = csp.chan();
var garbage = csp.chan();

var nonexistentRecorderIDs = {};
var existentRecorderIDs = fs.readFileSync('sound-recorders-2016-03-23T0646.txt', 'utf8')
      .split('\n')
      .map(function(line) {
        var parts = line.split(',');

        return parts && parts[1];
      })
      .reduce(function(accm, recorderID) {
        if (recorderID) accm[recorderID] = true;

        return accm;
      }, {});

function isGarbage(upload) {
  var out = csp.chan();

  uploads.isGarbage(existentRecorderIDs, nonexistentRecorderIDs, upload)
    .then(function(exists) {
      csp.putAsync(out, exists);
      out.close();
    })
    .catch(function(err) {
      console.log(err);
      out.close();
    });

  return out;
}

csp.go(function*() {
  var upload;

  while ((upload = yield source) != csp.CLOSED) {
    var toss = yield isGarbage(upload);

    if (toss) {
      yield csp.put(garbage, upload);
    } else {
      yield csp.put(sound, upload);
    }
  }
});

_.fileSink(filenames.garbage, _.mapChan(_.uploads.csv.encode, _.mapChan(_.uploads.parse, garbage)));
_.fileSink(filenames.sound, _.mapChan(_.uploads.csv.encode, _.mapChan(_.uploads.parse, sound)));
