//“YYYY-mm-dd HH:mm:ss” (e.g. “2015-07-24 15:36:10”). All timestamps must be in UTC.
module.exports = {
  type: 'string',
  pattern: '^20\\d{2}-[01]\\d[0-3]\\d\\s[0-2]:[0-5]\\d:[0-5]\\d$',
};
