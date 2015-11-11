var _ = require('utils');
var api_key = require('definitions/api_key');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var jwt = require('definitions/jwt');
var use = require('definitions/use');

exports.tags = ['links'];
exports.summary = 'Verify an email.';
exports.description = 'Handler for email verification links.';
exports.operationId = 'VerifyEmail';

exports.parameters = [
  {
    name: 'jwt',
    'in': 'query',
    required: true,
    type: 'string',
  },
];

/*
 * Success screen.
 * Expired screen - please check again.
 * Email not found or Internal Server Error screen.
 */
exports.responses = {
  '302': {
    description: 'Email validated.',
    headers: {
      'Location': {type: 'string'},
    },
  },
  '401': responses.Unauthorized,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:VerifyEmail/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  responses: {
    'default': {
      statusCode: '302',
      responseParameters: {
        'Location': 'https://peppermint.com/verified',
      },
    },
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
