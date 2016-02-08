var _ = require('lodash');
var recorder = require('definitions/recorder');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var use = require('definitions/use');

exports.deprecated = true;
exports.tags = ['deprecated'];
exports.summary = 'Authenticate a recorder.';
exports.description = 'Use the recorder_client_id and recorder_key from the POST /recorder request that registered this recorder to generate a new JWT token. This route uses Basic access authentication with an Authorization header like this: Basic Base64(recorder_client_id:recorder_key). If your recorder_client_id is UoZU5kTfnETz and your recorder_key is _tBqwNfVJI7-h86VOdhd0BvglTBRCJeuE3L4hDs3, then the Authorzation header should be "Basic VW9aVTVrVGZuRVR6Ol90QnF3TmZWSkk3LWg4NlZPZGhkMEJ2Z2xUQlJDSmV1RTNMNGhEczM=".';
exports.operationId = 'CreateRecorderToken';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  headers.AuthorizationBasic,
];

exports.responses = {
  '201': {
    description: 'New JWT and recorder',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: {
      title: 'CreateRecorderTokenOK',
      type: 'object',
      properties: {
        at: require('definitions/jwt'),
        recorder: use(recorder, ['description'], ['recorder_client_id', 'recorder_key', 'recorder_ts']),
      },
      required: ['at', 'recorder'],
    },
    examples: {
      'application/json': {
        at: 'abc.def.ghi',
        recorder: {
          recorder_client_id: 'some 123 client',
          recorder_key: 'abcDEF123',
          recorder_ts: '2015-10-19 09:19:55',
          description: 'Android 4.1 Nexus 5',
        },
      },
    },
  },
  '401': responses.Unauthorized,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-auth'] = {
  type: 'none',
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:CreateRecorderToken/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "{\"Authorization\": \"$input.params().header.get('Authorization')\"}",
  },
  requestParameters: {},
  responses: {
    'default': integrations.Created,
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
