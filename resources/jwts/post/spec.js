var headers = require('definitions/headers');
var integrations = require('definitions/integrations');
var responses = require('definitions/responses');

exports.tags = ['accounts', 'recorder', 'auth'];
exports.summary = 'Exchange credentials for an access token.';
exports.description = 'The Peppermint API authenticates both recorders and accounts. While most opeartions only require the client be authenticated as one or the other, some API operations require the client to be authenticated as both recorder and account. This endpoint uses a custom scheme in the Authorization header to accept credentials for both recorders and accounts and respond with a token asserting the bearer is both an account and recorder. It also accepts a single set of credentials to support clients that do not need to authenticate as both account and recorder.';
exports.operationId = 'Authenticate';
exports.consumes = exports.produces = ['application/vnd.api+json'];

exports.parameters = [
  {
    name: 'Authorization',
    'in': 'header',
    required: true,
    type: 'string',
    description: [
      'The scheme name is "Peppermint" and it accepts parameters named "recorder" or "account"',
      'The value of each scheme is the base64 encoding of the user:password credentials for each realm, exactly as would be used with the http "Basic" scheme.',
      'Assume a recorder has been registered with a recorder_client_id of "recorder123" and a recorder_key "hUI5EHweDQwq". The Authorization header under the Basic scheme for these credentials would be the base64 encoding of "recorder123:hUI5EHweDQwq" == "Basic cmVjb3JkZXIxMjM6aFVJNUVId2VEUXdx"',
      'To authenticate as a recorder only under the Peppermint scheme, the Authorization field would be "Peppermint recorder=cmVjb3JkZXIxMjM6aFVJNUVId2VEUXdx"',
      'Now assume an account has been registered with email "user@example.com" and password "secret". The Authorization header under the Basic scheme would be the base64 encoding of "user@example.com:secret" == "Basic dXNlckBleGFtcGxlLmNvbTpzZWNyZXQ=". To authenticate by account under the Peppermint scheme the Authorization header would be "Peppermint account=dXNlckBleGFtcGxlLmNvbTpzZWNyZXQ="',
      'If authenticating as both account and recorder, the Authorization header would be "Peppermint recorder=cmVjb3JkZXIxMjM6aFVJNUVId2VEUXdx, account=dXNlckBleGFtcGxlLmNvbTpzZWNyZXQ=", or equivalently "Peppermint account=dXNlckBleGFtcGxlLmNvbTpzZWNyZXQ=, recorder=cmVjb3JkZXIxMjM6aFVJNUVId2VEUXdx"',
    ].join('\n'),
  },
  headers.XApiKey,
];

exports.responses = {
  '200': {
    description: 'Credentials were valid; responding with JWT',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: {
      title: 'AuthenticateOK',
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: {type: 'string', pattern: 'jwts'},
            id: {type: 'string'},
            attributes: {
              type: 'object',
              properties: {
                token: {type: 'string'},
              },
              required: ['token'],
            },
          },
          required: ['type', 'id', 'attributes'],
        },
      },
      required: ['data'],
    },
    examples: {
      'application/vnd.api+json': {
        data: {
          type: 'jwts',
          id: '789xyz',
          attributes: {
            token: 'abc.123.def',
          },
          relationships: {
            recorder: {
              data: {
                type: 'recorders',
                id: '567def',
                attributes: {
                  //TODO
                }
              },
            },
            account: {
              data: {
                type: 'accounts',
                id: '345ghi',
                attributes: {
                  //TODO
                },
              },
            },
          },
        },
      },
    },
  },
  '400': responses.BadRequest,
  '401': responses.Unauthorized,
  '429': responses.RateLimited,
  '500': responses.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:Authenticate/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: integrations.requestTmplNoBody,
  responses: {
    'default': integrations.Created,
    'Bad Request.*': integrations.BadRequest,
    'Unauthorized.*': integrations.Unauthorized,
    'Too Many Requests.*': integrations.RateLimited,
    '^(?!Bad Request|Unauthorized|Too Many Requests)(.|\\n)+': integrations.Internal,
  },
};