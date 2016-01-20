var _ = require('lodash');
var dynamo = require('./dynamo');
var timestamp = require('./timestamp');

exports.get = function(clientID) {
  return dynamo.get('recorders', {
    client_id: {S: clientID},
  })
  .then(parseRecorderItem);
};

exports.update = function(recorderID, values) {
  return new Promise(function(resolve, reject) {
    var attrs = _.mapValues(values, function(v) {
      return {Value: v};
    });

    _.dynamo.updateItem({
      TableName: 'recorders',
      Key: {
        recorder_id: {S: recorderID},
      },
      AttributeUpdates: attrs,
    }, function(err, data) {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      resolve();
    });
  });
};

exports.resource = function(recorder) {
  if (!recorder) return null;

  var attrs = {
    recorder_client_id: recorder.client_id,
    recorder_key: recorder.recorder_key,
    recorder_ts: timestamp(recorder.recorder_ts),
  };

  if (recorder.description) {
    attrs.description = recorder.description;
  }

  return {
    type: 'recorders',
    id: recorder.recorder_id,
    attributes: attrs,
  };
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
