var _ = require('lodash');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var transcription = require('definitions/transcription');
var use = require('definitions/use');

exports.tags = ['transcriptions'];
exports.summary = 'Save a transcription for a recording.';
exports.operationId = 'CreateTranscription';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  headers.AuthorizationBearer,
  {
    name: 'X-Api-Key',
    'in': 'header',
    type: 'string',
    required: true,
  },
  {
    name: 'payload',
    'in': 'body',
    schema: use(transcription, [], ['audio_url', 'language', 'confidence', 'text']),
  },
];

exports.responses = {
  '201': {
    description: 'Transcription saved',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: use(transcription, [], [
      'audio_url',
      'language',
      'confidence',
      'text',
      'ip',
      'timestamp',
      'transcription_url',
    ]),
    examples: {
      'application/json': {
        transcription_url: 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/transcriptions/12345qrs',
        audio_url: 'http://peppermint.com/go/hijkl/12345qrs.m4a',
        ip: '127.0.0.1',
        timestamp: '2015-12-02 08:23:33',
        language: 'en-US',
        confidence: 0.77,
        text: 'example transcription',
      },
    },
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '403': responses.Forbidden,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:CreateTranscription/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"body": "$input.json(\'$\')", "ip": "$context.identity.source_id", "api_key": "$input.params(\'X-Api-Key\')"}',
  },
  responses: {
    'default': integrations.Created,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Forbidden.*': integrations.Forbidden,
    '^(?!Bad Request|Unauthorized|Forbidden)(.|\\n)+': integrations.Internal,
  },
};
