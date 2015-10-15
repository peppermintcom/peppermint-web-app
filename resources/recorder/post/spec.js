var _ = require('lodash');
var recorder = require('definitions/recorder');

exports.tags = ['recorder'];
exports.summary = 'Register a new recorder.';
exports.operationId = 'CreateRecorder';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'CreateRecorderReqBody',
      type: 'object',
      properties: {
        api_key: {type: 'string'},
        recorder: _.assign({}, recorder, {required: ['recorder_client_id']}),
      },
      required: ['api_key', 'recorder'],
    },
  },
];

exports.responses = {
  '201': {
    description: 'new recorder and a jwt',
    schema: {
      title: 'CreateRecorderOK',
      type: 'object',
      properties: {
        at: require('definitions/jwt'),
        recorder: recorder,
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
  '400': {
    description: 'Invalid Input Data',
    schema: {
      title: 'CreateRecorder400',
      type: 'string',
    },
  },
};

exports['x-amazon-apigateway-auth'] = {
  type: 'none',
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:CreateRecorder/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "$input.json('$')"
  },
  requestParameters: {},
  responses: {
    'default': {
      statusCode: '201',
      responseParameters: {},
      responseTemplates: {
        'application/json': "$input.json('$')"
      }
    },
    'Bad Request: .*': {
      statusCode: '400',
      responseParameters: {},
      responseTemplates: {},
    },
  },
};
