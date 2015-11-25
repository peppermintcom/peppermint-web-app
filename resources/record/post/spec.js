var _ = require('lodash');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');

exports.tags = ['record'];
exports.summary = 'Finalize an upload';
exports.operationId = 'CreateRecord';
exports.consumes = exports.produces = ['application/json'];
exports.deprecated = true;

exports.parameters = [
  headers.AuthorizationBearer,
  {
    name: 'payload',
    'in': 'body',
    description: 'CreateRecordRequestBody',
    required: true,
    schema: {
      type: 'object',
      properties: {
        signed_url: {type: 'string'},
      },
      required: ['signed_url'],
    },
  }
];

exports.responses = {
  '201': {
    description: 'Record',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
      'Content-Type': {type: 'string'},
    },
    schema: {
      title: 'CreateRecordOK',
      type: 'object',
      properties: {
        canonical_url: {type: 'string'},
        short_url: {type: 'string'},
      },
      required: ['canonical_url', 'short_url'],
    },
    examples: {
      'application/json': {
        canonical_url: 'https://peppermint-cdn.s3.amazonaws.com/AW3/cpLPai2DIqcETFtWsn0cWc',
        short_url: 'https://peppermint.com/lEh-MpCYGEpY',
      },
    },
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '403': responses.Forbidden,
  '404': responses.NotFound,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-auth'] = {
  type: 'none',
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:CreateRecord/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': "{\"Authorization\": \"$input.params().header.get('Authorization')\", \"body\":$input.json('$')}",
  },
  requestParameters: {},
  responses: {
    'default': integrations.Created,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Forbidden.*': integrations.Forbidden,
    'Not Found.*': integrations.NotFound,
    '^(?!Bad Request|Unauthorized|Forbidden|Not Found)(.|\\n)+': integrations.Internal,
  },
};
