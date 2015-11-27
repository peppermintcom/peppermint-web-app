var _ = require('utils');
var account = require('definitions/account');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var use = require('definitions/use');

exports.tags = ['accounts'];
exports.summary = 'Retrieve account profile.';
exports.operationId = 'GetAccount';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  headers.AuthorizationBearer,
  {
    name: 'account_id',
    'in': 'path',
    type: 'string',
    required: true,
  },
];

exports.responses = {
  '200': {
    description: 'Returning account profile.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: use(account, [], ['account_id', 'email', 'full_name', 'registration_ts', 'is_verified']),
    examples: {
      'application/json': {
        account_id: 'abcdefghijklMNOP7654',
        email: 'me@example.com',
        full_name: 'John Doe',
        registration_ts: '2015-10-19 09:19:55',
        is_verified: false,
      },
    },
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '403': responses.Forbidden,
  '404': responses.NotFound,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:GetAccount/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"Authorization": "$input.params(\'Authorization\')", "account_id": "$input.params(\'account_id\')"}',
  },
  responses: {
    'default': integrations.Ok,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Forbidden.*': integrations.Forbidden,
    'Not Found.*': integrations.NotFound,
    '^(?!Bad Request|Unauthorized|Forbidden|Not Found)(.|\\n)+': integrations.Internal,
  },
};
