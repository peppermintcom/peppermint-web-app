var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');

exports.tags = ['uploads'];
exports.summary = 'Get upload metadata from short_url';
exports.operationId = 'SearchUploads';
exports.produces = ['application/vnd.api+json'];

exports.parameters = [
  headers.XApiKey,
  {
    name: 'short_url',
    'in': 'query',
    type: 'string',
    description: 'https://peppermint.com/short',
    required: true,
  },
];

exports.responses = {
  '200': {
    description: 'Query completed.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
  },
  '400': responses.jsonAPI.BadRequest,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:SearchUploads/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')", "recipient_id": "$input.params(\'recipient\')", "sender_id": "$input.params(\'sender\')", "since": "$util.urlDecode($input.params(\'since\'))"}',
  },
  responses: {
    'default': integrations.jsonAPI.Ok,
    '400': integrations.jsonAPI.BadRequest,
    '^(?!400)(.|\\n)+': integrations.plain.Internal,
  },
};
