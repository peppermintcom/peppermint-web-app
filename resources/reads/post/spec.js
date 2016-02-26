var defs = require('definitions');
var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var _ = require('utils');

exports.tags = ['reads', 'inter-app'];
exports.summary = 'Mark a message as read.';
exports.description = 'Caller should be authenticated as recipient of the message.';
exports.operationId = 'ReadMessage';
exports.consumes = ['application/vnd.api+json'];

exports.parameters = [
  headers.AuthorizationBearer,
  headers.XApiKey,
  headers.ContentType,
  {
    name: 'payload',
   'in': 'body',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: {type: 'string', pattern: '^reads$'},
            id: {type: 'string', description: 'same as the message_id that was read'},
          },
          required: ['type', 'id'],
          additionalProperties: false,
        },
      },
      required: ['data'],
      additionalProperties: false,
    },
  },
];

exports.responses = {
  '204': {
    description: 'Message marked as read.',
    headers: {
      'Content-Type': {type: 'string'},
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
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:ReadMessage/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/vnd.api+json': '{"Content-Type": "$input.params(\'Content-Type\')", "body": $input.json(\'$\'), "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')"}',
  },
  responses: {
    'default': integrations.NoContent,
    '400': integrations.jsonAPI.BadRequest,
    '401': integrations.jsonAPI.Unauthorized,
    '403': integrations.jsonAPI.Forbidden,
    '415': integrations.jsonAPI.Unsupported,
    '^(?!400|401|403|415)(.|\\n)+': integrations.plain.Internal,
  },
};
