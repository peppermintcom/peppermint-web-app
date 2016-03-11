module.exports = {
  description: 'UTC timestamp in YYYY-mm-dd HH:mm:ss.sss format e.g. "2015-07-24 15:36:10.123"',
  type: 'string',
  pattern: '^20\\d{2}-[01]\\d-[0-3]\\d\\s[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d{3}$',
};
