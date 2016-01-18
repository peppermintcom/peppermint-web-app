var _ = require('./utils');

exports.example = {
  type: 'jwts',
  id: 'jwt123',
  attributes: {
    token: 'abc.123.def',
  },
};

var attributesSchema = {
  type: 'object',
  properties: {
    token: {type: 'string'},
  },
  required: ['token'],
};

exports.schema = _.resourceObjectSchema('jwts', attributesSchema);
