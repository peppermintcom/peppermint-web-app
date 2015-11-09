var _ = require('utils');
var api_key = require('definitions/api_key');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var jwt = require('definitions/jwt');
var use = require('definitions/use');

exports.tags = ['accounts PROPOSAL'];
exports.summary = 'Reset password.';
exports.description = 'Emails a link to reset password. The link points to a form on the peppermint.com web app.';
exports.operationId = 'AccountRecover';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  {
    name: 'payload',
    'in': 'body',
    schema: {
      title: 'AccountSignInRequestBody',
      type: 'object',
      properties: {
        api_key: api_key,
        email: {type: 'string'},
      },
      required: ['api_key', 'email'],
    },
  },
];

exports.responses = {
  '200': {
    description: 'Email has been sent.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
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
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:AccountRecover/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "$input.json('$')"
  },
  requestParameters: {},
  responses: {
    'default': integrations.Ok,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Conflict.*': integrations.Conflict,
    '^(?!Bad Request|Unauthorized|Conflict)(.|\\n)+': integrations.Internal,
  },
};