var _ = require('lodash');

//current time in YYYY-MM-DD HH:MM:SS string format
module.exports = function(d) {
  d = d ? new Date(d.valueOf()) : new Date();

  return [
    [
      d.getUTCFullYear(),
      _.padStart((d.getUTCMonth() + 1).toString(), 2, '0'),
      _.padStart(d.getUTCDate().toString(), 2, '0'),
    ].join('-'),
    [
      _.padStart(d.getUTCHours().toString(), 2, '0'),
      _.padStart(d.getUTCMinutes().toString(), 2, '0'),
      _.padStart(d.getUTCSeconds().toString(), 2, '0'),
    ].join(':')
  ].join(' ');
};
