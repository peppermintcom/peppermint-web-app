exports.AuthorizationBearer = {
  name: 'Authorization',
  'in': 'header',
  description: 'Must contain the word "Bearer" then a space, then the JWT.',
  required: true,
  type: 'string',
  pattern: '^Bearer .*',
};
