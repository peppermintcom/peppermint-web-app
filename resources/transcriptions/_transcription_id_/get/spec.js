var _ = require('lodash');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var headers = require('definitions/headers');
var transcription = require('definitions/transcription');
var use = require('definitions/use');

exports.tags = ['transcriptions'];
exports.summary = 'Get a transcription';
exports.operationId = 'GetTranscription';
exports.produces = ['application/json'];

exports.parameters = [
  headers.XApiKey,
  {
    name: 'transcription_id',
    'in': 'path',
    type: 'string',
    required: true,
  },
];

exports.responses = {
  '200': {
    description: 'Transcription retrieved',
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
  '401': responses.Unauthorized,
  '404': responses.NotFound,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:GetTranscription/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"api_key": "$input.params(\'X-Api-Key\')", "transcription_id": "$input.params(\'transcription_id\')"}',
  },
  responses: {
    'default': integrations.Ok,
    'Unauthorized.*': integrations.Unauthorized,
    'Not Found.*': integrations.NotFound,
    '^(?!Unauthorized|Not Found)(.|\\n)+': integrations.Internal,
  },
};
