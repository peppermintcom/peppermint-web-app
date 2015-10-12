exports.id = {
  type: 'integer',
  format: 'int64',
};

//“YYYY-mm-dd HH:mm:ss” (e.g. “2015-07-24 15:36:10”). All timestamps must be in UTC.
exports.timestamp = {
  type: 'string',
  pattern: '^20\d{2}-[01]\d[0-3]\d\s[0-2]:[0-5]\d:[0-5]\d$',
};

exports.jwt = {
  type: 'string',
};

exports.recorder = {
  type: 'object',
  properties: {
    recorder_id: {$ref: '#/definitions/id'},
    user_account_id: {$ref: '#/definitions/id'},
    recorder_client_id: {type: 'string'},
    recorder_key: {type: 'string'},
    recorder_ts: {$ref: '#/definitions/timestamp'},
    description: {type: 'string'},
  }
};
