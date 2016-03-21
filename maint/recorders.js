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

function clean(apiKey) {
  if (!apiKey) {
    throw new Error('api_key needed');
  }
  var recorders = _.scan(params(apiKey));
  
  csp.go(function*() {
    var recorder;

    //wait for an item then poll synchronously for as many as are available in
    //the channel, up to 25, and batch them together for delete
    while ((recorder = yield recorders) != csp.CLOSED) {
      //we can batch delete up to 25 items so check if up to 24 more are
      //available and then add the one we just took
      var batch = _.batch(24, recorders);
      batch.push(recorder);

      //map the full item to the key with checks that our filters worked
      var err = yield _.batchDiscard('recorders', _.map(batch, function(recorder) {
        if (recorder.api_key.S !== apiKey) {
          throw new Error(recorder.api_key.S);
        }
        if ((Date.now() - +recorder.recorder_ts.N) < _.WEEK) {
          throw new Error(recorder.recorder_ts.N);
        }
        return {client_id: {S: recorder.client_id}};
      }));

      if (err) _.log(err);
      batch
        .map(function(recorder) {
          return recorder.client_id.S + ',' + recorder.recorder_id.S;
        })
        .forEach(_.log);
    }
  });
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

exports.clean = clean;
exports.existsID = existsID;
