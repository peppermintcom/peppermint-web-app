var message = require('definitions/message');
var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var use = require('definitions/use');
var _ = require('utils');

exports.tags = ['inter-app'];
exports.summary = 'Send a message to an app.';
exports.description = 'Checks if there is an installed app associated with an email, then sends the message to that app if found.';
exports.operationId = 'CreateMessage';
exports.consumes = exports.produces = ['application/json'];

exports.parameters = [
  headers.AuthorizationBearer,
  headers.XApiKey,
  {
    name: 'payload',
    'in': 'body',
    schema: use(message, [], ['sender_email', 'recipient_email', 'audio_url']),
  },
];

exports.responses = {
  '202': {
    description: 'The recipient email is associated with an installed app and the message will probably be delivered.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: use(message, ['transcription_url'], ['message_id', 'audio_url', 'sender_email', 'recipient_email', 'created']),
    examples: {
      'application/json': {
        message_id: 'abcdefghijklmn87654',
        audio_url: 'http://go.peppermint.com/xyz/abc.m4a',
        transcription_url: 'http://go.peppermint.com/xyz/abc',
        sender_email: 'john@example.com',
        recipient_email: 'ann@example.com',
        created: '2015-10-19 09:19:55',
      },
    },
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '403': _.assign({}, responses.Forbidden, {
    description: 'The sender has been blocked from messaging this recipient.',
  }),
  '404': _.assign({}, responses.NotFound, {
    description: 'The recipient email is not associated with an installed app. This is a common response.',
  }),
  '409': _.assign({}, responses.Conflict, {
    description: 'The recipient has already sent this audio_url to the recipient.',
  }),
  '429': responses.RateLimited,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:CreateMessage/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': integrations.requestTmpl,
  },
  responses: {
    'default': integrations.Accepted,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Forbidden.*': integrations.Forbidden,
    'Not Found.*': integrations.NotFound,
    'Conflict.*': integrations.Conflict,
    'Too Many Requests.*': integrations.RateLimited,
    '^(?!Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Too Many Requests)(.|\\n)+': integrations.Internal,
  },
};
