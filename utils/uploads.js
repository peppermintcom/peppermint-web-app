var url = require('url');
var dynamo = require('./dynamo');
var timestamp2 = require('./timestamp2');

var INSECURE_ORIGIN = 'http://go.peppermint.com/';
var SECURE_ORIGIN = 'https://duw3fm6pm35xc.cloudfront.net/';

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

exports.resolve = function(shortURL) {
  var parts = url.parse(shortURL);

  return dynamo.get('short-urls', {key: {S: parts.pathname.substring(1)}})
    .then(function(record) {
      if (!record) {
        return null;
      }
      return get(record.pathname && record.pathname.S);
    });
};

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

function resource(upload) {
  if (!upload) return null;
  var attrs = {
    canonical_url: INSECURE_ORIGIN + upload.pathname,
    secure_url: SECURE_ORIGIN + upload.pathname,
    sender_email: upload.sender_email,
    sender_name: upload.sender_name,
    created: timestamp2(upload.created),
    is_complete: !!upload.uploaded,
  };
  if (upload.seconds) {
    attrs.duration = upload.seconds;
  }
  if (upload.transcription) {
    attrs.transcription = upload.transcription;
  }

  return {
    type: 'uploads',
    id: upload.pathname,
    attributes: attrs,
  };
}

exports.resource = resource;
