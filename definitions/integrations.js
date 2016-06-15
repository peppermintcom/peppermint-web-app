var _ = require('lodash');

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

exports.NoContent = {
  statusCode: '204',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
    'method.response.header.Content-Type': "''",
  },
  responseTemplates: {
    //empty response
    'application/json': "$util.escapeJavascript('')",
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

exports.Unsupported = {
  statusCode: '415',
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
    'application/json': '{"errorMessage": "Internal Server Error"}',
  },
};

exports.requestTmpl = '{"body": $input.json(\'$\'), "ip": "$context.identity.sourceIp", "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')"}';

exports.requestTmplNoBody = '{"ip": "$context.identity.sourceIp", "api_key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')"}';

exports.jsonapiRequestTmpl = '{"Content-Type": "$input.params(\'Content-Type\')", "body": $input.json(\'$\'), "X-Api-Key": "$input.params(\'X-Api-Key\')", "Authorization": "$input.params(\'Authorization\')"}';

var jsonAPIError = {
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
    'method.response.header.Content-Type': "'application/vnd.api+json'",
  },
  responseTemplates: {
    'application/json': '{"errors": [$input.path("$").errorType]}',
  },
};

exports.jsonAPI = {
  Ok: {
    statusCode: '200',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Origin': "'*'",
      'method.response.header.Content-Type': "'application/vnd.api+json'",
    },
    responseTemplates: {},
  },
  BadRequest: _.assign({statusCode: '400'}, jsonAPIError),
  Unauthorized: _.assign({statusCode: '401'}, jsonAPIError),
  Forbidden: _.assign({statusCode: '403'}, jsonAPIError),
  NotFound: _.assign({statusCode: '404'}, jsonAPIError),
  Conflict: _.assign({statusCode: '409'}, jsonAPIError),
  Unsupported: _.assign({statusCode: '415'}, jsonAPIError),
};

exports.plain = {
  Internal: {
    statusCode: '500',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Origin': "'*'",
      'method.response.header.Content-Type': "'text/plain'",
    },
    responseTemplates: {
      'application/json': "Internal Server Error",
    },
  },
};
