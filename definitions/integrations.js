exports.Created = {
  statusCode: '201',
  responseParameters: {},
  responseTemplates: {},
};

exports.BadRequest = {
  statusCode: '400',
  responseParameters: {},
  responseTemplates: {},
};

exports.Unauthorized = {
  statusCode: '401',
  responseParameters: {},
  responseTemplates: {},
};

exports.Conflict = {
  statusCode: '409',
  responseParameters: {},
  responseTemplates: {},
};

exports.Internal = {
  statusCode: '500',
  responseParameters: {},
  responseTemplates: {
    'application/json': "{\"errorMessage\": \"Internal Server Error\"",
  },
};
