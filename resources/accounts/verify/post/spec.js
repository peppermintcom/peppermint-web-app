var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');

exports.tags = ['accounts'];
exports.summary = 'Resend verification email.';
exports.description = 'Looks up the email address associated with the account_id specified in the Authorization header and sends an email with a verification link.';
exports.operationId = 'VerifyEmail';

exports.parameters = [
  headers.AuthorizationBearer,
];

exports.responses = {
  '200': {
    description: 'Email sent.',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
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
  requestTemplates: {
    'application/json': "{\"Authorization\": \"$input.params().header.get('Authorization')\"}",
  },
  responses: {
    'default': integrations.OK,
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
