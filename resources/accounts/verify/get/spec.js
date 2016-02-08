var _ = require('utils');
var api_key = require('definitions/api_key');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var jwt = require('definitions/jwt');
var use = require('definitions/use');

exports.tags = ['private'];
exports.summary = 'Verify an email.';
exports.description = 'Handler for email verification links. Cannot be called directly by client apps.';
exports.operationId = 'VerifyEmail';

exports.parameters = [
  {
    name: 'jwt',
    'in': 'query',
    required: true,
    type: 'string',
  },
];

exports.responses = {
  '200': {
    description: 'Email validated.',
  },
  '401': responses.Unauthorized,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:VerifyEmail/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"jwt": "$input.params().querystring.get(\'jwt\')", "ip": "$context.identity.sourceIp"}',
  },
  responses: {
    'default': integrations.Ok,
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
