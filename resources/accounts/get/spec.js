var _ = require('utils');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var use = require('definitions/use');

exports.tags = ['accounts'];
exports.summary = 'Search accounts';
exports.description = 'This operation is used to check if an account exists with a given email. It returns a plain 401 "Unauthorized" error if an account exists with the email and a 404 if it does not. Incorrect or missing api keys will also generate 401 responses but the error message will contain the term "api_key".';
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
  '400': {
    description: 'Missing or invalid api_key or email.',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
    },
  },
  '401': {
    description: 'An account with the given email exists.',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
    },
  },
  '404': {
    description: 'No account with the given email exists.',
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
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Not Found.*': integrations.NotFound,
    '^(?!Bad Request|Unauthorized|Not Found)(.|\\n)+': integrations.Internal,
  },
};
