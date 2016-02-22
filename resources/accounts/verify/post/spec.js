var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');

exports.tags = ['accounts'];
exports.summary = 'Resend verification email.';
exports.description = 'Looks up the email address associated with the account_id specified in the Authorization header and sends an email with a verification link. If the email cannot be delivered to the email the returned error will have a 400 status code and a body equal to any of "Bad Request: hard-bounce", "Bad Request: soft-bounce", "Bad Request: spam", or "Bad Request: unsub", depending on the cause';
exports.operationId = 'ReverifyEmail';

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
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:ReverifyEmail/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "{\"Authorization\": \"$input.params().header.get('Authorization')\"}",
  },
  responses: {
    'default': integrations.Ok,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!BadRequest|Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
