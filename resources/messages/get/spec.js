var defs = require('definitions');
var headers = require('definitions/headers');
var responses = require('definitions/responses');
var integrations = require('definitions/integrations');
var _ = require('utils');

exports.tags = ['messages', 'inter-app'];
exports.summary = 'Search messages collection';
exports.description = 'The Authorization header should authenticate the recipient or sender account. If there is another page of results, there will be a links.next property in the body. Either the recipient or sender parameter is required in the querystring, but not both due to limitations of indexes in DynamoDB. Set order=reverse to query from newest to oldest';
exports.operationId = 'SearchMessages';
exports.produces = ['application/vnd.api+json', 'text/plain'];

exports.parameters = [
  headers.AuthorizationBearer,
  headers.XApiKey,
  {
    name: 'recipient',
    'in': 'query',
    type: 'string',
    description: 'account_id of the recipient, which should be authenticated by Authorization header',
    required: false,
  },
  {
    name: 'sender',
    'in': 'query',
    type: 'string',
    description: 'account_id of the sender, which should be authenticated by Authorization header',
    required: false,
  },
  {
    name: 'since',
    'in': 'query',
    type: 'string',
    description: 'Only messages created after this timestamp will be returned. It should be timestamp like "2016-01-01 00:00:00" which would be "2016-01-01%2000%3A00%3A00" after url-encoding. Optional.',
    required: false,
  },
  {
    name: 'until',
    'in': 'query',
    type: 'string',
    description: 'Only messages created before this timestamp will be returned.',
    required: false,
  },
  {
    name: 'order',
    'in': 'query',
    type: 'string',
    description: '"chronological" (default) or "reverse"',
  },
  {
    name: 'position',
    'in': 'query',
    type: 'string',
    description: 'An opaque string returned in a "next" link from a previous call to this endpoint.',
  }
];

exports.responses = {
  '200': {
    description: 'Query completed.',
    headers: {
      'Content-Type': {type: 'string'},
      'Access-Control-Allow-Origin': {type: 'string'},
    },
    schema: defs.messages.collection.schema,
    examples: {
      'application/vnd.api+json': defs.messages.collection.example,
    },
  },
  '400': responses.jsonAPI.BadRequest,
  '401': responses.jsonAPI.Unauthorized,
  '403': responses.jsonAPI.Forbidden,
  '500': responses.plain.Internal,
};

exports['x-amazon-apigateway-integration'] = {
  type: 'aws',
  uri : 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:819923996052:function:GetMessages/invocations',
  httpMethod: 'POST',
  credentials: 'arn:aws:iam::819923996052:role/APIGatewayLambdaExecRole',
  requestTemplates: {
    'application/json': '{"api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')", "recipient_id": "$input.params(\'recipient\')", "sender_id": "$input.params(\'sender\')", "since": "$util.urlDecode($input.params(\'since\'))", "position": "$input.params(\'position\')", "order": "$input.params(\'order\')"}',
  },
  responses: {
    'default': integrations.jsonAPI.Ok,
    '400': integrations.jsonAPI.BadRequest,
    '401': integrations.jsonAPI.Unauthorized,
    '403': integrations.jsonAPI.Forbidden,
    '^(?!400|401|403)(.|\\n)+': integrations.plain.Internal,
  },
};
