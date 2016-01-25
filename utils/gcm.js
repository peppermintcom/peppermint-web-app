var http = require('./http');
var URL = 'https://android.googleapis.com/gcm/notification';
var _ = require('lodash');
var post = _.partialRight(_.partial(http.postJSON, URL), {
    Authorization: 'key=' + process.env.PEPPERMINT_GCM_API_KEY, 
    project_id: process.env.PEPPERMINT_GCM_SENDER_ID,
  });

exports.addDeviceGroupMember = function(email, notificationKey, registrationID) {
  return post({
      operation: 'add',
      notification_key: notificationKey,
      notification_key_name: email,
      registration_ids: [registrationID],
    })
    .then(handle);
};

exports.removeDeviceGroupMember = function(email, notificationKey, registrationID) {
  return post({
      operation: 'remove',
      notification_key: notificationKey,
      notification_key_name: email,
      registration_ids: [registrationID],
    })
    .then(handle);
};

exports.createDeviceGroup = function(email, registrationID) {
  return post({
      operation: 'create',
      notification_key_name: email,
      registration_ids: [registrationID],
    })
    .then(handle);
};

function handle(res) {
  if (res.statusCode != 200) {
    console.log(res.body);
    throw new Error(res.statusCode);
  }
  return res.body;
}
