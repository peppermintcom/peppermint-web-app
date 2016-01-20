exports.tags = ['recorders'];
exports.summary = 'Update gcm_registration_token';
exports.description = 'Associate a GCM Registration Token with a device so it can receive notifications.';
exports.operationId = 'UpdateRecorder';
exports.consumes = ['application/vnd.api+json'];

exports.parameters = [
  headers.AuthorizationBearer,
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'UpdateRecorderRequestBody',
      type: 'object',
      properties: {
        data: null,
      },
      required: ['data'],
      additionalProperites: false,
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
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '403': responses.Forbidden,
  '404': responses.NotFound,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:UpdateRecorder/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/vnd.api+json': '{"body": $input.json(\'$\'), "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')", "recorder_id": "$input.params(\'recorder_id\')"}';
  },
  responses: {
    'default': integrations.Ok,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Forbidden.*': integrations.Forbidden,
    'Not Found.*': integrations.NotFound,
    '^(?!Bad Request|Unauthorized|Forbidden|Not Found)(.|\\n)+': integrations.Internal,
  },
};
