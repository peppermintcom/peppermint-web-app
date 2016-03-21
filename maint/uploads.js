var files = require('./files');
var recorders = require('./recorders');

//Discard if the recorder that produced it is gone and it is more than a week old.
function clean() {
  var uploads = _.scan({
    TableName: 'uploads',
    Limit: 100,
  });
  var recorderOK = filterRecorderExists(uploads);

  _.devnull(recorderOK.pass);
  _.stdout(recorderOK.errors);

  var garbage = _.filterFrom(isWeekOld, recorderOK.pass);

  _.stdout(discard(garbage));
  //_.stdout(files.discard(garbage));
}

//If a recorder exists with the uploads's recorder_id (from the pathbname) then
//forward the upload to the pass channel; otherwise forward it to the fail
//channel.
function filterRecorderExists(source) {
  return _.filterAsync(source, function(receiver) {
    return recorders.existsID(recorderID(upload));
  });
}

function recorderID(upload) {
  return upload.pathname.S.split('/')[0];
}

function isWeekOld(upload) {
  var weekAgo = Date.now() - _.WEEK;

  return +upload.created.N < weekAgo;
}

var discard = _.partial(_.batchAndDiscard, uploads, key);

function key(upload) {
  return upload.pathname;
}
