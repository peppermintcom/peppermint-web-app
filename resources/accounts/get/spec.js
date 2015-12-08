var _ = require('utils');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var use = require('definitions/use');

exports.tags = ['accounts'];
exports.summary = 'Search accounts';
exports.description = 'This operation is used to check if an account exists with a given email. It will return an empty array if no account exists with the email. Otherwise it will return an array with a partial representation of the account resource.';
exports.operationId = 'QueryAccounts';

exports.parameters = [
  {
    name: 'X-Api-Key',
    'in': 'header',
    type: 'string',
    required: true,
  },
  {
    name: 'email',
    'in': 'query',
    type: 'string',
    required: true,
  },
];

exports.responses = {
  '200': {
    description: 'Returning matching accounts.',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
    },
  },
  '400': {
    description: 'Missing or invalid api_key or email.',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
    },
  },
  '401': {
    description: 'api_key is unknown',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
    },
  },
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:QueryAccounts/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"email": "$input.params(\'email\')", "api_key": "$input.params(\'X-Api-Key\')"}',
  },
  responses: {
    'default': integrations.Ok,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!Bad Request|Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
