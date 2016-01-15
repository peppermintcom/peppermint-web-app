var dynamo = require('./dynamo');

exports.get = function(clientID) {
  return dynamo.get('recorders', {
    client_id: {S: clientID},
  })
  .then(parseRecorderItem);
};

function parseRecorderItem(recorder) {
  if (!recorder) return null;

  return {
    client_id: recorder.client_id.S,
    api_key: recorder.api_key.S,
    recorder_id: recorder.recorder_id.S,
    recorder_key: recorder.recorder_key.S,
    recorder_ts: parseInt(recorder.recorder_ts.N, 10),
    description: (recorder.description && recorder.description.S) || '',
  };
}
