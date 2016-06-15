var defs = require('definitions');
var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var _ = require('lodash');

exports.tags = ['messages', 'inter-app'];
exports.summary = 'Send a message to an app.';
exports.description = 'Checks if there is an installed app associated with an email, then sends the message to that app if found.';
exports.operationId = 'NewMessage';
exports.consumes = exports.produces = ['application/vnd.api+json'];

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
        data: defs.messages.requestSchema,
      },
      required: ['data'],
      additionalProperties: false,
    },
  },
];

exports.responses = {
  '202': {
    description: 'The recipient email is associated with an installed app and the message will probably be delivered.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: defs.messages.responseSchema,
    examples: {
      'application/vnd.api+json': {data: defs.messages.example},
    },
  },
  '400': responses.jsonAPI.BadRequest,
  '401': responses.jsonAPI.Unauthorized,
  '403': _.assign({}, responses.jsonAPI.Forbidden, {
    description: 'The sender has been blocked from messaging this recipient or the Authorization header does not match the sender_email.',
  }),
  '404': _.assign({}, responses.jsonAPI.NotFound, {
    description: 'The recipient email is not associated with an installed app. This is a common response.',
  }),
  '409': responses.jsonAPI.Conflict,
  '415': responses.jsonAPI.Unsupported,
  '500': responses.plain.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:NewMessage/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/vnd.api+json': '{"Content-Type": "$input.params(\'Content-Type\')", "body": $input.json(\'$\'), "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')"}',
  },
  responses: {
    'default': integrations.Accepted,
    '400': integrations.jsonAPI.BadRequest,
    '401': integrations.jsonAPI.Unauthorized,
    '403': integrations.jsonAPI.Forbidden,
    '404': integrations.jsonAPI.NotFound,
    '409': integrations.jsonAPI.Conflict,
    '415': integrations.jsonAPI.Unsupported,
    '^(?!400|401|403|404|409|415)(.|\\n)+': integrations.plain.Internal,
  },
};
