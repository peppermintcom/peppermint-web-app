var defs = require('definitions');
var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');

exports.tags = ['accounts', 'inter-app'];
exports.summary = 'Set up a recorder to receive messages for an account.';
exports.operationId = 'AddAccountReceiver';
exports.consumes = exports.produces = ['application/vnd.api+json'];

exports.parameters = [
  headers.AuthorizationBearer,
  headers.ContentType,
  headers.XApiKey,
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
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              type: {type: 'string', pattern: '^recorders$'},
            },
            required: ['id', 'type'],
            additionalProperties: false,
          },
          minLength: 1,
          maxLength: 1,
        },
      },
      required: ['data'],
      additionalProperties: false,
    },
  },
];

exports.responses = {
  '204': {
    description: 'Recorder can receive messages for account.',
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
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:AddAccountReceiver/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/vnd.api+json': '{"Content-Type": "$input.params(\'Content-Type\')", "body": $input.json(\'$\'), "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')", "account_id": "$input.params(\'account_id\')"}',
  },
  responses: {
    'default': integrations.NoContent,
    '400': integrations.jsonAPI.BadRequest,
    '401': integrations.jsonAPI.Unauthorized,
    '403': integrations.jsonAPI.Forbidden,
    '415': integrations.jsonAPI.Unsupported,
    '^(?!400|401|403|415)(.|\\n)+': integrations.Internal,
  },
};
