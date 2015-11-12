var _ = require('utils');
var api_key = require('definitions/api_key');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var jwt = require('definitions/jwt');
var use = require('definitions/use');

exports.tags = ['accounts'];
exports.summary = 'Login with email and password.';
exports.description = 'Exchange an email and password for a JWT.';
exports.operationId = 'AccountSignIn';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  headers.AuthorizationBasicAccount,
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'AccountSignInRequestBody',
      type: 'object',
      properties: {
        api_key: api_key,
      },
      required: ['api_key'],
    },
  },
];

exports.responses = {
  '200': {
    description: 'Credentials are correct. Returning a JWT with account_id.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: {
      title: 'AccountSignInOK',
      type: 'object',
      properties: {
        at: jwt,
        u: use(account, [], ['account_id', 'email', 'first_name', 'last_name', 'registration_ts']),
      },
      required: ['at', 'u'],
    },
    examples: {
      'application/json': {
        at: 'abc.123.def',
        u: {
          account_id: 'abcdefghijklMNOP7654',
          email: 'me@example.com',
          first_name: 'Andrew',
          last_name: 'Reed',
          registration_ts: '2015-10-19 09:19:55',
        },
      },
    },
  },
  '401': responses.Unauthorized,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:AccountSignIn/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "{\"body\": $input.json('$'), \"Authorization\": \"$input.params().header.get('Authorization')\"}",
  },
  requestParameters: {},
  responses: {
    'default': integrations.Ok,
    'Unauthorized.*': integrations.Unauthorized,
    '^(?!Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
