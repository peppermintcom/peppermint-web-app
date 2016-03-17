var csp = require('js-csp');
var _ = require('./utils');

function params(apiKey) {
  var weekAgo = Date.now() - _.WEEK;

  return {
    Limit: 5,
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

    while ((recorder = yield recorders) != csp.CLOSED) {
      if (recorder.api_key.S !== apiKey) {
        throw new Error(recorder.api_key.S);
      }
      if ((Date.now() - +recorder.recorder_ts.N) < _.WEEK) {
        throw new Error(recorder.recorder_ts.N);
      }
      console.log(recorder);
      yield _.discard('recorders', {client_id: recorder.client_id});
      _.log(recorder.recorder_id);
    }
  });
}

clean('abc123');
