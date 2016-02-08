var defs = require('definitions');
var headers = require('definitions/headers');
var integrations = require('definitions/integrations');
var responses = require('definitions/responses');
var _ = require('utils');

exports.tags = ['auth', 'inter-app'];
exports.summary = 'Exchange credentials for an access token.';
exports.description = 'The Peppermint API authenticates both recorders and accounts. While most opeartions only require the client be authenticated as one or the other, some API operations require the client to be authenticated as both recorder and account. This endpoint uses a custom scheme in the Authorization header to accept credentials for both recorders and accounts and respond with a token asserting the bearer is both an account and recorder. It also accepts a single set of credentials to support clients that do not need to authenticate as both account and recorder. A client can authenticate by account using the google or facebook parameter with an accessToken that verifies the user email. Only one of account, google, or facebook parameter can appear in a header.';
exports.operationId = 'Authenticate';
exports.produces = ['application/vnd.api+json'];

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
      'To authenticate with Google or Facebook, use google=base64(email:access_token) or facebook=base64(email:access_token)',
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
        data: defs.withRelationships(defs.jwts.schema, 'recorder', 'account'),
        included: defs.includedSchema,
      },
      required: ['data', 'included'],
    },
    examples: {
      'application/vnd.api+json': {
        data: _.assign({}, defs.jwts.example, {
          relationships: {
            recorder: {data: _.pick(defs.recorders.example, 'type', 'id')},
            account: {data: _.pick(defs.accounts.example, 'type', 'id')},
          },
        }),
        included: [
          defs.recorders.example,
          _.assign({}, defs.accounts.example, {relationships: {receivers: {data: [{type: 'recorders', id: 'recorder123'}]}}}),
        ],
      },
    },
  },
  '400': responses.jsonAPI.BadRequest,
  '401': responses.jsonAPI.Unauthorized,
  '404': responses.jsonAPI.NotFound,
  '500': responses.plain.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:Authenticate/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': integrations.requestTmplNoBody,
  },
  responses: {
    'default': integrations.jsonAPI.Ok,
    '400': integrations.jsonAPI.BadRequest,
    '401': integrations.jsonAPI.Unauthorized,
    '404': integrations.jsonAPI.NotFound,
    '^(?!400|401|404)(.|\\n)+': integrations.plain.Internal,
  },
};
