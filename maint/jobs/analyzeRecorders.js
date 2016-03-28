//Scan all recorders. Remove inconsistent recorders. Remove recorders with a
//development api_key at least a week old. Log inconsistent removals to a file.
//Log dev removals to a file. Log unremoved recorder_ids to a file.
var csp = require('js-csp');
var recorders = require('../recorders');
var _ = require('../utils');

//YYYY-MM-DDTHHMM
var start = _.timestamp().replace(' ', 'T').replace(':', '');
start = start.substring(0, start.indexOf(':'));
const INCONSISTENT = 'inconsistent-recorders-' + start + '.txt';
const GARBAGE = 'garbage-recorders-' + start + '.txt';
const SOUND = 'sound-recorders-' + start + '.txt';

var clientID = _.partialRight(_.get, 'client_id.S');

var source = recorders.source();
var inconsistent = csp.chan();
var garbage = csp.chan();
var sound = csp.chan();

csp.go(function*() {
  var recorder;
  var soundN = 0;
  var inconsistentN = 0;
  var garbageN = 0;

  while ((recorder = yield source) != csp.CLOSED) {
    if (!_.recorders.isConsistent(recorder)) {
      inconsistentN++;
      yield csp.put(inconsistent, recorder);
    } else if (recorders.isGarbage(recorder)) {
      garbageN++;
      yield csp.put(garbage, recorder);
    } else {
      soundN++;
      yield csp.put(sound, recorder);
    }
  }
  console.log('sound: ' + soundN);
  console.log('inconsistent: ' + inconsistentN);
  console.log('garbage: ' + garbageN);
  console.log('total: ' + (garbageN + soundN + inconsistentN));
});

_.fileSink(INCONSISTENT, _.mapChan(clientID, inconsistent));
_.fileSink(GARBAGE, _.mapChan(recorders.ids, garbage));
_.fileSink(SOUND, _.mapChan(csv, sound));

function csv(recorder) {
  return [
    recorder.client_id.S,
    recorder.recorder_id.S,
    recorder.api_key.S,
    recorder.recorder_ts.N
  ].join(',');
}
