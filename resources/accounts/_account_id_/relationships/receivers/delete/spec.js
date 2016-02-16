var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');

exports.tags = ['accounts', 'inter-app'];
exports.summary = 'Break an account-recorder receiver relationship';
exports.operationId = 'RemoveAccountReceiver';
exports.produces = ['application/vnd.api+json', 'text/plain'];

exports.parameters = [
  headers.XApiKey,
  headers.AuthorizationBearer,
  headers.ContentType,
  {
    name: 'account_id',
    'in': 'path',
    type: 'string',
    required: true,
  },
  {
    name: 'payload',
    'in': 'body',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          minItems: 1,
          maxItems: 1,
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              type: {type: 'string', pattern: '^recorders$'},
            },
            required: ['id', 'type'],
            additionalProperties: false,
          },
        },
      },
      required: ['data'],
      additionalProperties: false,
    },
  },
];

exports.responses = {
  '204': {
    description: 'Account link to recorder has been broken.',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
      'Content-Type': {type: 'string'},
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
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:RemoveAccountReceiver/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/vnd.api+json': '{"Content-Type": "$input.params(\'Content-Type\')", "Authorization": "$input.params(\'Authorization\')", "api_key": "$input.params(\'X-Api-Key\')", "body": $input.json(\'$\'), "account_id": "$input.params(\'account_id\')"}',
  },
  responses: {
    'default': integrations.NoContent,
    '400': integrations.jsonAPI.BadRequest,
    '401': integrations.jsonAPI.Unauthorized,
    '403': integrations.jsonAPI.Forbidden,
    '415': integrations.jsonAPI.Unsupported,
    '^(?!400|401|403:415)(.|\\n)+': integrations.plain.Internal,
  },
};
