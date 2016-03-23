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
  };
}

function format(upload) {
  var params =  {
    pathname: {S: upload.pathname},
    created: {N: upload.created.valueOf().toString()},
  };

  if (upload.sender_email) {
    params.sender_email = {S: upload.sender_email};
  }
  if (upload.sender_name) {
    params.sender_name = {S: upload.sender_name};
  }
  if (upload.uploaded) {
    params.uploaded = {N: upload.uploaded.valueOf().toString()};
  }
  if (upload.seconds) {
    params.seconds = {N: upload.seconds.toString()};
  }
  if (upload.postprocessed) {
    params.postprocessed = {N: upload.postprocessed.valueOf().toString()};
  }

  return params;
}

function encodeCSV(upload) {
  return [
    upload.pathname,
    upload.created.valueOf().toString(),
    upload.sender_email || '',
    upload.sender_name || '',
    (upload.uploaded && upload.uploaded.valueOf().toString()) || '',
    (upload.seconds && upload.seconds.toString()) || '',
    (upload.postprocessed && upload.postprocessed.valueOf().toString()) || ''
  ].join(',');
}

function decodeCSV(row) {
  var parts = row.split(',');

  var upload = {
    pathname: parts[0],
    created: new Date(+parts[1]),
  };

  if (parts[2]) {
    upload.sender_email = parts[2];
  }
  if (parts[3]) {
    upload.sender_name = parts[3];
  }
  if (parts[4]) {
    upload.sender_name = parts[4];
  }
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
