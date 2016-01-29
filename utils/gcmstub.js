var _ = require('lodash');
var token = require('./randomtoken');
var conf = require('utils/conf');

var gcmStore = exports.store = {};

var invalidRegistrationID = {error: 'no valid registration ids'};
var partialSend = {
  "success":1,
  "failure":2,
  "failed_registration_ids": [
    "regId1",
    "regId2"
  ]
};

var sends = exports.sends = [];
exports.sendToDeviceGroup = function(message) {
  devCheck();
  if (!message || !message.to || (!message.data && !message.notification)) throw new Error('400');
  if (!gcmStore[message.to]) throw new Error('404');


  sends.push(message);

  return Promise.resolve({
    success: gcmStore[message.to].length,
    failure: 0,
  });
};

exports.createDeviceGroup = function(email, registrationID) {
  devCheck();
  if (!email || !registrationID) throw new Error(email + registrationID);

  var notificationKey = token(64);
  gcmStore[notificationKey] = [registrationID];

  return Promise.resolve({
    notification_key: notificationKey,
  });
};

exports.addDeviceGroupMember = function(email, notificationKey, registrationID) {
  devCheck();
  gcmStore[notificationKey].push(registrationID);

  return Promise.resolve();
};

exports.removeDeviceGroupMember = function(email, notificationKey, registrationID) {
  devCheck();
  var group = gcmStore[notificationKey];

  group = _.without(group, registrationID);

  if (group.length) {
    gcmStore[notificationKey] = group;
  } else {
    delete gcmStore[notificationKey];
  }

  return Promise.resolve();
};

//fail quickly if stubs find their way into production
function devCheck() {
  if (conf.NODE_ENV === 'production') {
    throw new Error('GCM stubs in production');
  }
}
