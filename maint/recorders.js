var csp = require('js-csp');
var _ = require('./utils');

function params(apiKey) {
  var weekAgo = Date.now() - _.WEEK;

  return {
    Limit: 100,
    TableName: 'recorders',
    FilterExpression: 'api_key = :api_key AND recorder_ts <= :week_ago',
    ExpressionAttributeValues: {
      ':api_key': {S: apiKey},
      ':week_ago': {N: weekAgo.toString()},
    },
  };
}

var discard = _.partial(_.batchAndDiscard, 'recorders', _.partialRight(_.pick, 'client_id'));

function source() {
  return _.scan({
    Limit: 100,
    TableName: 'recorders',
  });
}

function clean(apiKey) {
  if (!apiKey) {
    throw new Error('api_key needed');
  }
  var removed = discard(_.scan(params(apiKey)));

  _.stdout(removed.errors);
  _.stdout(csp.operations.mapFrom(ids, removed.ok));
}

//returns <client_id>,<recorder_id> string
function ids(recorder) {
  return recorder.client_id.S + ',' + recorder.recorder_id.S;
}

//Returns a channel with a single boolean or error.
function existsID(recorderID) {
  var done = csp.chan();

  _.recorders.getByID(recorderID)
    .then(function(item) {
      csp.putAsync(done, item ? true : false);
    })
    .catch(function(err) {
      csp.putAsync(done, err);
    })
    .then(function() {
      done.close();
    });

  return done;
}

//True iff dev api key and more than a week old.
function isGarbage(recorder) {
  return recorder.api_key.S === 'abc123' && _.isWeekOld(+recorder.recorder_ts.N);
}

function encodeCSV(recorder) {
  return [
    recorder.client_id.S,
    recorder.recorder_id.S,
    recorder.api_key.S,
    recorder.recorder_ts.N
  ].join(',');
}

function decodeCSV(string) {
  var parts = string.split(',');

  return {
    client_id: {S: parts[0]},
    recorder_id: {S: parts[1]},
    api_key: {S: parts[2]},
    recorder_ts: {N: parts[3]},
  };
}

exports.source = source;
exports.clean = clean;
exports.existsID = existsID;
exports.ids = ids;
exports.isGarbage = isGarbage;
exports.encodeCSV = encodeCSV;
exports.decodeCSV = decodeCSV;
exports.discard = discard;

module.exports = _.assign({}, _.recorders, exports);
