var _ = require('lodash');
var recorder = require('definitions/recorder');

exports.tags = ['upload'];
exports.summary = 'Initialize a new upload';
exports.operationId = 'CreateUpload';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  {
    name: 'jwt',
    'in': 'header',
    description: 'Auth Bearer token',
    required: true,
    type: 'string',
    pattern: '^Bearer .*',
  },
  {
    name: 'payload',
    'in': 'body',
    description: 'File Metadata',
    required: true,
    schema: {
      type: 'object',
      properties: {
        contentType: {type: 'string'},
      },
      required: ['contentType'],
    },
  }
];

exports.responses = {
  '201': {
    description: 'Signed Insert Url',
    schema: {
      title: 'CreateUploadOK',
      type: 'object',
      properties: {
        signed_url: {type: 'string'},
      },
      required: ['signed_url'],
    },
    headers: {
      'Content-Type': {type: 'string'},
    },
    examples: {
      'application/json': {
        signed_url: 'https://peppermint-cdn.s3.amazonaws.com/AW3/cpLPai2DIqcETFtWsn0cWc?AWSAccessKeyId=AKIAJZTQ4SASPHAFE5AQ&Expires=1445220215&Signature=47q4xCdhIc89K0SMm2YHH%2BQIAdI%3D',
      },
    },
  },
  '401': {
    description: 'Invalid API Key',
    schema: {
      title: 'CreateUpload401',
      type: 'string',
    },
  },
  '500': {
    description: 'Internal Server Error',
    schema: {
      title: 'CreateUpload500',
      type: 'string',
    },
  },
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
    'default': {
      statusCode: '201',
      responseParameters: {},
      responseTemplates: {
        'application/json': "$input.json('$')"
      }
    },
    'Unauthorized: .*': {
      statusCode: '401',
      responseParameters: {},
      responseTemplates: {
        'application/json': "$input.json('$')",
      },
    },
    '^(?!Unauthorized)(.|\\n)+' :{
      statusCode: '500',
      responseParameters: {},
      responseTemplates: {
        'application/json': "{\"errorMessage\": \"Internal Server Error\"",
      },
    }
  },
};
