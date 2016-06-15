var _ = require('lodash');

exports.BadRequest = {
  description: 'Bad Request',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errorMessage: {
        description: 'May contain the name of missing parameters or more details on the rejection of a supplied parameter.',
        type: 'string',
      },
    },
  },
};

exports.Unauthorized = {
  description: 'Unauthorized',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errorMessage: {
        description: 'May contain more information about the required credentials and whether they are expired, missing, or invalid.',
        type: 'string',
      },
    },
  },
};

exports.Forbidden = {
  description: 'Forbidden - the authenticated user is not authorized to perform the requested action',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errorMessage: {
        type: 'string',
      },
    },
  },
};

exports.NotFound = {
  description: 'Not Found',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errorMessage: {
        type: 'string',
      },
    },
  },
};

exports.Conflict = {
  description: 'Conflict',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errorMessage: {
        type: 'string',
      },
    },
  },
};

exports.Unsupported = {
  description: 'Unsupported Media Type',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errorMessage: {
        type: 'string',
      },
    },
  },
};

exports.RateLimited = {
  description: 'Too Many Requests',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errorMessage: {
        type: 'string',
      },
    },
  },
};

exports.Internal = {
  description: 'Internal Server Error',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'string',
  },
};

exports.plain = {
  Internal: {
    description: 'Internal Server Error',
    headers: {
      'Access-Control-Allow-Origin': {type: 'string'},
      'Content-Type': {type: 'string'},
    },
    schema: {
      type: 'string',
    },
  },
};

//extend with a description
var jsonAPIClientError = {
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
    'Content-Type': {type: 'string'},
  },
  schema: {
    type: 'object',
    properties: {
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {type: 'string'},
            detail: {type: 'string'},
            code: {type: 'string'},
          },
          additionalProperties: false,
        },
        minLength: 1,
      },
    },
    required: ['errors'],
    additionalProperties: false,
  },
};

exports.jsonAPI = {
  BadRequest: _.assign({description: 'Bad Request'}, jsonAPIClientError),
  Unauthorized: _.assign({description: 'Unauthorized'}, jsonAPIClientError),
  Forbidden: _.assign({description: 'Forbidden'}, jsonAPIClientError),
  NotFound: _.assign({description: 'Not Found'}, jsonAPIClientError),
  Conflict: _.assign({description: 'Conflict'}, jsonAPIClientError),
  Unsupported: _.assign({description: 'Unsupported Media Type'}, jsonAPIClientError),
};
