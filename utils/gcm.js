var http = require('./http');
var URL = 'https://android.googleapis.com/gcm/notification';
var _ = require('lodash');
var conf = require('./conf');
var post = _.partialRight(_.partial(http.postJSON, URL), {
    Authorization: 'key=' + conf.PEPPERMINT_GCM_API_KEY, 
    project_id: conf.PEPPERMINT_GCM_SENDER_ID,
  });

exports.sendToDeviceGroup = function(message) {
  return http.postJSON('https://gcm-http.googleapis.com/gcm/send', message, {
    Authorization: 'key=' + conf.PEPPERMINT_GCM_API_KEY,
  }).then(handle);
};

exports.addDeviceGroupMember = function(email, notificationKey, registrationID) {
  return post({
      operation: 'add',
      notification_key: notificationKey,
      notification_key_name: email.toLowerCase(),
      registration_ids: [registrationID],
    })
    .then(handle);
};

exports.removeDeviceGroupMember = function(email, notificationKey, registrationID) {
  return post({
      operation: 'remove',
      notification_key: notificationKey,
      notification_key_name: email.toLowerCase(),
      registration_ids: [registrationID],
    })
    .then(handle);
};

exports.createDeviceGroup = function(email, registrationID) {
  return post({
      operation: 'create',
      notification_key_name: email.toLowerCase(),
      registration_ids: [registrationID],
    })
    .then(handle);
};

function handle(res) {
  console.log('GCM Response:');
  console.log(res.statusCode);
  console.log(res.headers);
  console.log(res.body);
  if (res.statusCode != 200) {
    throw new Error(res.statusCode);
  }
  return res.body;
}
