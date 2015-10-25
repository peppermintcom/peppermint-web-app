exports.AuthorizationBearer = {
  name: 'Authorization',
  'in': 'header',
  description: 'Must contain the word "Bearer" then a space, then the JWT.',
  required: true,
  type: 'string',
  pattern: '^Bearer .*',
};

exports.AuthorizationBasic = {
  name: 'Authorization',
  'in': 'header',
  description: 'Must contain the word "Basic" then a space, then the Base64 encoded recorder_client_id, ":", and recorder_key.',
  required: true,
  type: 'string',
  pattern: '^Basic .*',
};
