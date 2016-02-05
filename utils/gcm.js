var http = require('./http');
var conf = require('./conf');
var recorders = require('./recorders');
var _ = require('lodash');

exports.send = function(message) {
  return http.postJSON('https://gcm-http.googleapis.com/gcm/send', message, {
    Authorization: 'key=' + conf.PEPPERMINT_GCM_API_KEY,
  }).then(function(res) {
    console.log('GCM Response:');
    console.log(res.statusCode);
    console.log(res.headers);
    console.log(res.body);
    if (res.statusCode != 200) {
      throw new Error(res.statusCode);
    }
    return res.body;
  });
};

//update database for invalid tokens
exports.sync = function(recorders, results) {
  if (results.failure || results.canonical_ids) {
    return Promise.all(_.map(results.results, function(r, i) {
      if (r.message_id && r.registration_id) {
        return changeToken(recorders[i], r.registration_id);
      }
      if (r.error) {
        if (/InvalidRegistration|NotRegistered/.test(r.error)) {
          return deleteToken(recorders[i]);
        }
        //Unavailable could be retried
      }
      return Promise.resolve();
    }));
  }
  return Promise.resolve();
};

function deleteToken(recorder) {
  return recorders.update(recorder.client_id, 'REMOVE gcm_registration_token');
};

function changeToken(recorder, newToken) {
  return recorders.update(recorder.client_id, 'SET gcm_registration_token = :token', {
    ':token': {S: newToken},
  });
}
