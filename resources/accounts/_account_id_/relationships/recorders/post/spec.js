var account = require('definitions/account');
var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var use = require('definitions/use');

exports.tags = ['accounts'];
exports.summary = 'Associate a recorder with an account';
exports.operationId = 'LinkAccountRecorder';
exports.consumes = exports.produces = ['application/vnd.api+json'];

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
    description: 'Account linked to recorder',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
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
