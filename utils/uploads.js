var dynamo = require('./dynamo');

exports.get = function(pathname) {
  return dynamo.get('uploads', {
    pathname: {S: pathname},
  })
  .then(parse);
};

exports.update = function(pathname, expr, values) {
  return dynamo.update('uploads', {pathname: {S: pathname}}, expr, values);
};

function parse(item) {
  return {
    pathname: item.pathname.S,
    sender_email: item.sender_email && item.sender_email.S,
    sender_name: item.sender_name && item.sender_name.S,
    created: item.created && parseInt(item.created.N, 10),
    uploaded: item.uploaded && parseInt(item.uploaded.N, 10),
    seconds: item.seconds && parseInt(item.seconds.N, 10),
    api_key: item.api_key && item.api_key.S,
  };
}
