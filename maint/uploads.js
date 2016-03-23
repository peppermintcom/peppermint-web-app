var recorders = require('./recorders');
var _ = require('./utils');

var discard = _.partial(_.batchAndDiscard, 'uploads', key);
var pathname = _.partialRight(_.get, 'pathname.S');

//Discard if the recorder that produced it is gone and it is more than a week old.
function clean() {
  var source = garbage();
  var removed = discard(source.out);

  _.stderr(_.merge(source.errors, removed.errors));
  //_.stdout(_.mapFrom(pathname, removed.ok));
}

//Returns a channel with all uploads at least a week old that are not related to
//an existing recorder.
function garbage() {
  var out = _.chan();
  var errors = _.chan();
  var recorderOK = filterRecorderExists(weekOld());

  return recorderOK;

  //ignore uploads related to an existing recorder
  _.devnull(recorderOK.pass);
  
  return {
    out: recorderOK.fail,
    errors: recorderOK.errors,
  };
}

//Returns a channel with all uploads at least a week old.
function weekOld() {
  var weekAgo = Date.now() - _.WEEK;

  return _.scan({
    TableName: 'uploads',
    Limit: 100,
    FilterExpression: 'created <= :week_ago',
    ExpressionAttributeValues: {
      ':week_ago': {N: weekAgo.toString()},
    },
  });
}

//If a recorder exists with the uploads's recorder_id (from the pathbname) then
//forward the upload to the pass channel; otherwise forward it to the fail
//channel.
function filterRecorderExists(source) {
  return _.filterAsync(source, function(upload) {
    return recorders.existsID(recorderID(upload));
  });
}

function recorderID(upload) {
  try {
    return pathname(upload).split('/')[0];
  } catch(err) {
    return null;
  }
}

function isWeekOld(upload) {
  var weekAgo = Date.now() - _.WEEK;

  return +upload.created.N < weekAgo;
}

function key(upload) {
  return upload.pathname;
}

exports.clean = clean;
exports.garbage = garbage;
exports.weekOld = weekOld;
exports.pathname = pathname;
exports.recorderID = recorderID;
