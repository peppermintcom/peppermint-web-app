var _ = require('lodash');
var randomstring = require('randomstring');

exports.token = function(length) {
  return randomstring.generate({
    length: length || 32,
    charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
  });
};

exports.timestamp = function(d) {
  d = new Date(d);

  return [
    [
      d.getUTCFullYear(),
      _.padLeft((d.getUTCMonth() + 1).toString(), 2, '0'),
      _.padLeft(d.getUTCDate().toString(), 2, '0'),
    ].join('-'),
    [
      _.padLeft(d.getUTCHours().toString(), 2, '0'),
      _.padLeft(d.getUTCMinutes().toString(), 2, '0'),
      _.padLeft(d.getUTCSeconds().toString(), 2, '0'),
    ].join(':')
  ].join(' ');
};

module.exports = _.assign(exports, _);
