var expect = require('chai').expect;
var spec = require('../resources/uploads/get/spec.js');
var _ = require('utils/test');

describe('GET /uploads', function() {
  describe('query short_url', function() {
    var shortPath = _.token(12);
    var upload;

    before(function() {
      return _.fake.upload().then(function(_upload) {
        upload = _upload;

        return _.dynamo.put('short-urls', {
          key: {S: shortPath},
          pathname: {S: upload.pathname},
          created: {N: Date.now().toString()},
        });
      });
    });

    describe('short_url not found', function() {
      _.result(200, spec, getParams('https://peppermint.com/xxxxxxx'),
      'should return an empty collection', function(body) {
        expect(body).to.deep.equal({data: []});
      });
    });

    describe('short_url points to an incomplete upload', function() {
      _.result(200, spec, getParams('https://peppermint.com/' + shortPath),
          'should return 1 upload.', function(body) {
            checkBody(body, upload.pathname, false); 
          });
    });

    describe('short_url points to a complete upload', function() {
      before(function() {
        return _.uploads.update(upload.pathname, 'SET uploaded = :now, seconds = :seconds', {
          ':now': {N: Date.now().toString()},
          ':seconds': {N: '9'},
        });
      });

      _.result(200, spec, getParams('https://peppermint.com/' + shortPath),
          'should return 1 upload.', function(body) {
            checkBody(body, upload.pathname, true, 9);
          });
    });

    describe('short_url points to a complete upload with transcription', function() {
      var tx;

      before(function() {
        var id = _.transcriptions.idFromURL(upload.pathname);

        return _.fake.transcription(null, id)
          .then(function(_transcription) {
            tx = _transcription;
          });
      });

      _.result(200, spec, getParams('https://peppermint.com/' + shortPath),
          'short return 1 upload.', function(body) {
            checkBody(body, upload.pathname, true, 9, tx.text);
          });
    });
  });

  describe('no query parameters', function() {
    _.fail(400, 'Invalid short_url query parameter', spec, function() {
      return _.assign(getParams()(), {url: '/uploads'});
    });
  });

  describe.skip('api key errors', function() {
    _.apiKeyErrors(spec, getParams('https://peppermint.com/x'));
  });
});

function checkBody(body, pathname, isComplete, duration, transcription) {
  expect(body.data).to.have.length(1);
  expect(body.data[0]).to.have.property('type', 'uploads');
  expect(body.data[0]).to.have.property('id', pathname);
  expect(body.data[0]).to.have.property('attributes');
  var attrs = body.data[0].attributes;
  expect(attrs).to.have.property('canonical_url', 'http://go.peppermint.com/' + pathname);
  expect(attrs).to.have.property('secure_url', 'https://duw3fm6pm35xc.cloudfront.net/' + pathname);
  expect(attrs).to.have.property('is_complete', isComplete);
  if (duration) {
    expect(attrs).to.have.property('duration', duration);
  } else {
    expect(attrs).not.to.have.property('duration');
  }
  if (transcription) {
    expect(attrs).to.have.property('transcription', transcription);
  } else {
    expect(attrs).not.to.have.property('transcription');
  }
}

function headers() {
  return {
    'X-Api-Key': _.fake.API_KEY,
    'Accept': 'application/vnd.api+json',
  };
}

function url(shortURL) {
  return '/uploads?short_url=' + encodeURIComponent(shortURL);
}

function getParams(shortURL) {
  return function() {
    return {
      method: 'GET',
      headers: headers(),
      url: url(shortURL),
    };
  };
}
