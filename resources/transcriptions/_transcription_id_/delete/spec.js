var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');

exports.tags = ['transcriptions'];
exports.summary = 'Delete a transcription';
exports.operationId = 'DeleteTranscription';
exports.produces = ['application/vnd.api+json', 'text/plain'];

exports.parameters = [
  headers.XApiKey,
  headers.AuthorizationBearer,
  {
    name: 'transcription_id',
    'in': 'path',
    type: 'string',
    required: true,
  },
];

exports.responses = {
  '204': {
    description: 'Transcription deleted',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
      'Content-Type': {type: 'string'},
    },
  },
  '401': responses.jsonAPI.Unauthorized,
  '403': responses.jsonAPI.Forbidden,
  '500': responses.plain.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:DeleteTranscription/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"Authorization": "$input.params(\'Authorization\')", "api_key": "$input.params(\'X-Api-Key\')", "transcription_id": "$input.params(\'transcription_id\')"}',
  },
  responses: {
    'default': integrations.NoContent,
    '401': integrations.jsonAPI.Unauthorized,
    '403': integrations.jsonAPI.Forbidden,
    '^(?!401)(.|\\n)+': integrations.plain.Internal,
  },
};
