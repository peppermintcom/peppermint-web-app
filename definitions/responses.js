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

exports.Internal = {
  description: 'Internal Server Error',
  headers: {
    'Access-Control-Allow-Origin': {type: 'string'},
  },
  schema: {
    type: 'string',
  }
};
