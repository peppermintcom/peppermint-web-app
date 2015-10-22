exports.Created = {
  statusCode: '201',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {},
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

exports.Forbidden = {
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

exports.Internal = {
  statusCode: '500',
  responseParameters: {
    'method.response.header.Access-Control-Allow-Origin': "'*'",
  },
  responseTemplates: {
    'application/json': "{\"errorMessage\": \"Internal Server Error\"",
  },
};
