var url = require('url');
var dynamo = require('./dynamo');

var get = exports.get = function(pathname) {
  return dynamo.get('uploads', {
    pathname: {S: pathname},
  })
  .then(parse);
};

exports.getByURL = function(audioURL) {
  return get(pathname(audioURL));
};

var update = exports.update = function(pathname, expr, values) {
  return dynamo.update('uploads', {pathname: {S: pathname}}, expr, values);
};

exports.updateByAudioURL = function(audioURL, expr, values) {
  return update(pathname(audioURL), expr, values);
};

function pathname(audioURL) {
  var parts = url.parse(audioURL);

  return parts.pathname.substring(1);
}

function parse(item) {
  if (!item) return null;

  return {
    pathname: item.pathname.S,
    sender_email: item.sender_email && item.sender_email.S,
    sender_name: item.sender_name && item.sender_name.S,
    created: item.created && parseInt(item.created.N, 10),
    uploaded: item.uploaded && parseInt(item.uploaded.N, 10),
    seconds: item.seconds && parseInt(item.seconds.N, 10),
    postprocessed: item.postprocessed && +item.postprocessed.N,
    api_key: item.api_key && item.api_key.S,
  };
}
