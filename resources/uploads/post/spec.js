var _ = require('lodash');
var recorder = require('definitions/recorder');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');

exports.tags = ['uploads'];
exports.summary = 'Initialize a new upload';
exports.description = 'The API will generate a signed URL where a file can be uploaded. The client must include the content type of the file in the request and in the PUT operation to the returned signed_url. The response will include a canonical_url where the file will be available after upload and a short_url that resolves to the canonical_url. The canonical_url will have a file extension of ".mp3" for content_types of "audio/mpeg" or "audio/mp3" and ".m4a" for content_type "audio/mp4".';
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
        sender_name: {
          type: 'string',
          description: 'The full name of the speaker uploading audio.',
        },
        sender_email: {
          type: 'string',
          description: 'The reply to email of the speaker uploading audio.',
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
        canonical_url: {type: 'string'},
        short_url: {type: 'string'},
      },
      required: ['signed_url', 'canonical_url', 'short_url'],
    },
    examples: {
      'application/json': {
        signed_url: 'https://peppermint-cdn.s3.amazonaws.com/AW3/cpLPai2DIqcETFtWsn0cWc?AWSAccessKeyId=AKIAJZTQ4SASPHAFE5AQ&Expires=1445220215&Signature=47q4xCdhIc89K0SMm2YHH%2BQIAdI%3D',
        canonical_url: 'http://go.peppermint.com/AW3/cpLPai2DIqcETFtWsn0cWc',
        short_url: 'https://peppermint.com/lEh-MpCYGEpY',
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
