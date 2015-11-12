var headers = require('definitions/headers');
var api_key = require('definitions/api_key');
var use = require('definitions/use');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');

exports.tags = ['accounts'];
exports.summary = 'Change password.';
exports.description = 'Currently this operation only supports changing passwords using an email password reset link. It may be expanded in the future to support changing other account information using a regular account auth token from a client app.';
exports.operationId = 'ChangePassword';
exports.consumes = ['application/json'];

exports.parameters = [
  headers.AuthorizationBearer,
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'ChangePasswordRequestBody',
      type: 'object',
      properties: {
        api_key: api_key,
        u: use(account, [], ['password']),
      },
      required: ['api_key', 'u'],
    },
  },
];

exports.responses = {
  '200': {
    description: 'Password successfully changed.',
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:ChangePassword/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "{\"Authorization\": \"$input.params().header.get('Authorization')\", \"body\":$input.json('$')}",
  },
  responses: {
    'default': integrations.Ok,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!Bad Request|Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
