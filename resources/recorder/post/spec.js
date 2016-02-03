var _ = require('lodash');
var recorder = require('definitions/recorder');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var api_key = require('definitions/api_key');
var use = require('definitions/use');

exports.tags = ['recorder'];
exports.summary = 'Register a new recorder.';
exports.description = 'This operation is performed only once for each install of an application or extension. The client must provide a unique recorder_client_id. The response will provide a JWT token that should be used to authenticate future requests to the API. The response also provides a recorder_client_key that works like a password when it\'s time to get a new JWT from the API.';
exports.operationId = 'CreateRecorder';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'CreateRecorderRequestBody',
      type: 'object',
      properties: {
        api_key: api_key,
        recorder: use(recorder, ['description', 'recorder_client_id', 'recorder_key']),
      },
      required: ['api_key', 'recorder'],
    },
  },
];

exports.responses = {
  '201': {
    description: 'new recorder and a jwt',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: {
      title: 'CreateRecorderOK',
      type: 'object',
      properties: {
        at: require('definitions/jwt'),
        recorder: use(recorder, ['description'], ['recorder_id', 'recorder_client_id', 'recorder_key', 'recorder_ts']),
      },
      required: ['at', 'recorder'],
    },
    examples: {
      'application/json': {
        at: 'abc.def.ghi',
        recorder: {
          recorder_id: 'recorder123',
          recorder_client_id: 'some 123 client',
          recorder_key: 'abcDEF123',
          recorder_ts: '2015-10-19 09:19:55',
          description: 'Android 4.1 Nexus 5',
        },
      },
    },
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '409': responses.Conflict,
  '500': responses.Internal,
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
    'default': integrations.Created,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Conflict.*': integrations.Conflict,
    '^(?!Bad Request|Unauthorized|Conflict)(.|\\n)+': integrations.Internal,
  },
};
