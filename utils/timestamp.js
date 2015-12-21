var _ = require('lodash');

//current time in YYYY-MM-DD HH:MM:SS string format
module.exports = function(d) {
  d = d ? new Date(d.valueOf()) : new Date();

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
