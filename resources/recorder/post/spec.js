exports.tags = ['recorder'];
exports.summary = 'Register a new recorder.';
exports.operationId = 'CreateRecorder';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  {
    name: 'payload',
    'in': 'body',
    schema: {
      type: 'object',
      properties: {
        api_key: {type: 'string'},
        recorder: {$ref: '#/definitions/recorder'},
      },
    },
  },
];

exports.responses = {
  '201': {
    description: 'new recorder and a jwt',
    schema: {
      type: 'object',
      properties: {
        at: {$ref: '#/definitions/jwt'},
        recorder: {$ref: '#/definitions/recorder'},
      },
      required: ['at', 'recorder'],
    },
    headers: {
      'Content-Type': {type: 'string'},
    },
    examples: {
      'application/json': {
        at: 'abc.def.ghi',
        recorder: {
          recorder_id: 1234567890,
          user_account_id: 2345678901,
          recorder_client_id: 'some 123 client',
          recorder_key: 'abcDEF123',
          recorder_ts: '2015-10-19 09:19:55',
          description: 'Android 4.1 Nexus 5',
        },
      },
    },
  },
};
