var _ = require('utils');
var api_key = require('definitions/api_key');
var jwt = require('definitions/jwt');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var use = require('definitions/use');

exports.tags = ['accounts PROPOSAL'];
exports.summary = 'Register a new account by email.';
exports.description = 'By registering an account, a user can associate multiple recorders with the account and share data between recorders.';
exports.operationId = 'CreateAccount';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'CreateAccountRequestBody',
      type: 'object',
      properties: {
        api_key: api_key,
        u: use(account, [], ['email', 'password', 'first_name', 'last_name']),
      },
      required: ['api_key', 'u'],
    },
  },
];

exports.responses = {
  '201': {
    description: 'Account created with email verification pending.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: {
      title: 'CreateAccountOK',
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
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '409': responses.Conflict,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-auth'] = {
  type: 'none',
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:CreateAccount/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "$input.json('$')"
  },
  requestParameters: {},
  responses: {
    'default': integrations.Created,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Conflict.*': integrations.Conflict,
    '^(?!Bad Request|Unauthorized|Conflict)(.|\\n)+': integrations.Internal,
  },
};