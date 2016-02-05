var _ = require('lodash');
var conf = require('utils/conf');
var token = require('./randomtoken');

var sends = exports.sends = [];
var gcmStore = exports.store = {};

//fail quickly if stubs find their way into production
if (conf.NODE_ENV === 'production') {
  throw new Error('GCM stubs in production');
}

exports.sync = require('./gcm').sync;

exports.good = function(registrationToken) {
  var result = {
    multicast_id: Math.floor(Math.random() * 100000000),
    success: 1,
    failure: 0,
    canonical_ids: 0,
    results: [{message_id: token(24)}],
  };

  gcmStore[registrationToken] = result;

  return result;
};

exports.bad = function(registrationToken) {
  var err = _.sample(['InvalidRegistration', 'NotRegistered']);

  var result = {
    multicast_id: Math.floor(Math.random() * 100000000),
    success: 0,
    failure: 1,
    canonical_ids: 0,
    results: [{error: err}],
  };

  gcmStore[registrationToken] = result;

  return result;
};

exports.old = function(registrationToken) {
  var result = {
    multicast_id: Math.floor(Math.random() * 100000000),
    success: 1,
    failure: 0,
    canonical_ids: 1,
    results: [{message_id: token(24), registration_id: token(64)}]
  };
 
  gcmStore[registrationToken] = result;

  return result;
};

exports.send = function(message) {
  if (!message || !message.to || (!message.data && !message.notification)) throw new Error('400');
  if (!gcmStore[message.to]) throw new Error('404 no mock response for ' + message.to);

  sends.push(message);

  return Promise.resolve(gcmStore[message.to]);
};
