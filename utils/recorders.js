var _ = require('lodash');
var dynamo = require('./dynamo');
var timestamp = require('./timestamp');

exports.get = function(clientID) {
  return dynamo.get('recorders', {
    client_id: {S: clientID},
  })
  .then(parseRecorderItem);
};

var getByID = exports.getByID = function(recorderID) {
  return new Promise(function(resolve, reject) {
    dynamo.query({
      TableName: 'recorders',
      IndexName: 'recorder_id-index',
      KeyConditionExpression: 'recorder_id = :recorder_id',
      ExpressionAttributeValues: {
        ':recorder_id': {S: recorderID},
      },
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      if (data.Count > 1) {
        var msg = 'recorder lookup by id "' + recorderID + '" returned multiple recorders';
 
        console.log(msg);
        reject(new Error(msg));
        return;
      }

      resolve(parseRecorderItem(data.Items && data.Items[0]));
    });
  });
};

var update = exports.update = function(clientID, expr, values) {
  return dynamo.update('recorders', {client_id: {S: clientID}}, expr, values);
};

exports.updateGCMToken = function(clientID, newToken) {
  return update(clientID, 'SET gcm_registration_token = :token', {
    ':token': {S: newToken},
  });
};

exports.updateByID = function(recorderID, values) {
  return getByID(recorderID)
    .then(function(recorder) {
      return new Promise(function(resolve, reject) {
        var attrs = _.mapValues(values, function(v) {
          return {Value: v};
        });

        dynamo.updateItem({
          TableName: 'recorders',
          Key: {
            client_id: {S: recorder.client_id},
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
  if (recorder.gcm_registration_token) {
    attrs.gcm_registration_token = recorder.gcm_registration_token;
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
    gcm_registration_token: recorder.gcm_registration_token && recorder.gcm_registration_token.S,
  };
}

function isConsistent(recorder) {
  return !!(recorder.client_id &&
    recorder.client_id.S &&
    recorder.api_key &&
    recorder.api_key.S &&
    recorder.recorder_ts &&
    recorder.recorder_ts.N &&
    recorder.recorder_id &&
    recorder.recorder_id.S &&
    recorder.recorder_key &&
    recorder.recorder_key.S);
}

exports.isConsistent = isConsistent;
