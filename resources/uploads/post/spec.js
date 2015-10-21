var _ = require('lodash');
var recorder = require('definitions/recorder');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');

exports.tags = ['uploads'];
exports.summary = 'Initialize a new upload';
exports.description = 'The API will generate a signed URL where a file can be uploaded. The client must include the content type of the file in the request and in the PUT operation to the returned signed_url.';
exports.operationId = 'CreateUpload';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  headers.AuthorizationBearer,
  {
    name: 'payload',
    'in': 'body',
    description: 'File Metadata',
    required: true,
    schema: {
      title: 'CreateUploadRequestBody',
      type: 'object',
      properties: {
        content_type: {
          type: 'string',
          description: 'The content type of the file that will be uploaded, such as "audio/x-aac".'
        },
      },
      required: ['content_type'],
    },
  }
];

exports.responses = {
  '201': {
    description: 'Signed Insert Url',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: {
      title: 'CreateUploadOK',
      type: 'object',
      properties: {
        signed_url: {type: 'string'},
      },
      required: ['signed_url'],
    },
    examples: {
      'application/json': {
        signed_url: 'https://peppermint-cdn.s3.amazonaws.com/AW3/cpLPai2DIqcETFtWsn0cWc?AWSAccessKeyId=AKIAJZTQ4SASPHAFE5AQ&Expires=1445220215&Signature=47q4xCdhIc89K0SMm2YHH%2BQIAdI%3D',
      },
    },
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-auth'] = {
  type: 'none',
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:CreateUpload/invocations',
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
    '^(?!Bad Request|Unauthorized)(.|\\n)+': integrations.Internal,
  },
};
