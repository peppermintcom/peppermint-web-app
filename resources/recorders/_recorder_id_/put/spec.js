var integrations = require('definitions/integrations');
var responses = require('definitions/responses');
var headers = require('definitions/headers');
var defs = require('definitions');

exports.tags = ['recorders'];
exports.summary = 'Update gcm_registration_token';
exports.description = 'Associate a GCM Registration Token with a device so it can receive notifications.';
exports.operationId = 'UpdateRecorder';
exports.consumes = ['application/vnd.api+json'];

exports.parameters = [
  headers.AuthorizationBearer,
  headers.ContentType,
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'UpdateRecorderRequestBody',
      type: 'object',
      properties: {
        data: defs.recorders.schemaGCM,
      },
      required: ['data'],
      additionalProperties: false,
    },
  },
  {
    name: 'recorder_id',
    'in': 'path',
    type: 'string',
    required: true,
  },
];

exports.responses = {
  '200': {
    description: 'Recorder updated',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
    },
  },
  '400': responses.jsonAPI.BadRequest,
  '401': responses.jsonAPI.Unauthorized,
  '403': responses.jsonAPI.Forbidden,
  '415': responses.jsonAPI.Unsupported,
  '500': responses.plain.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:UpdateRecorder/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/vnd.api+json': '{"Content-Type": "$input.params(\'Content-Type\')", "body": $input.json(\'$\'), "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')", "recorder_id": "$input.params(\'recorder_id\')"}',
  },
  responses: {
    'default': integrations.Ok,
    '400': integrations.jsonAPI.BadRequest,
    '401': integrations.jsonAPI.Unauthorized,
    '403': integrations.jsonAPI.Forbidden,
    '415': integrations.jsonAPI.Unsupported,
    '^(?!400|401|403|415)(.|\\n)+': integrations.plain.Internal,
  },
};
