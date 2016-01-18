exports.Ok = {
  statusCode: '200',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.Created = {
  statusCode: '201',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.Accepted = {
  statusCode: '202',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
};

exports.Expired = {
  statusCode: '303',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
    'method.response.header.Location': "'https://peppermint.com/expired'",
  },
};

exports.BadRequest = {
  statusCode: '400',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.Unauthorized = {
  statusCode: '401',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.Forbidden = {
  statusCode: '403',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.NotFound = {
  statusCode: '404',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.Conflict = {
  statusCode: '409',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.RateLimited = {
  statusCode: '429',
  responseParamters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
};

exports.Internal = {
  statusCode: '500',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {
    'application/json': "{\"errorMessage\": \"Internal Server Error\"",
  },
};

exports.requestTmpl = '{"body": $input.json(\'$\'), "ip": "$context.identity.sourceIp", "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')"}';

exports.requestTmplNoBody = '{"ip": "$context.identity.sourceIp", "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')"}';
