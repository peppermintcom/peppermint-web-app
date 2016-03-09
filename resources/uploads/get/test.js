var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('GET /uploads', function() {
  var key = _.token(12);

  describe('no short_url', function() {
    it('should fail with a 400 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
      }, {
        succeed: function(res) {
          done(new Error('success without short_url'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Invalid short_url query parameter');
          done();
        }
      });
    });
  });

  describe('short_url points to nothing.', function() {
    it('should return an empty collection.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        short_url: 'https://peppermint.com/' + key,
      }, {
        succeed: function(res) {
          expect(res).to.deep.equal({data: []});
          done();
        },
        fail: done,
      });
    });
  });

  describe('short_url points to an incomplete upload', function() {
    var upload;

    before(function() {
      return _.fake.upload().then(function(_upload) {
        upload = _upload;

        return _.dynamo.put('short-urls', {
          key: {S: key},
          created: {N: Date.now().toString()},
          pathname: {S: upload.pathname},
        });
      });
    });

    it('should return the upload.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        short_url: 'https://peppermint.com/' + key,
      }, {
        succeed: function(res) {
          ok(res, upload.pathname, false);
          done();
        },
        fail: done,
      });
    });

    describe('short_url points to a completed, postprocessed upload', function() {
      var duration = 15;
      var now = Date.now();

      before(function() {
        return _.uploads.update(upload.pathname, 'SET seconds = :seconds, uploaded = :now, postprocessed = :now', {
          ':seconds': {N: duration.toString()},
          ':now': {N: now.toString()},
        });
      });

      it('should return the upload with is_complete and duration props', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          short_url: 'https://peppermint.com/' + key,
        }, {
          succeed: function(res) {
            ok(res, upload.pathname, true, duration);
            done();
          },
          fail: done,
        });
      });

      describe('with a transcription available', function() {
        var tx;

        before(function() {
          var id = _.transcriptions.idFromURL(upload.pathname);

          return _.fake.transcription(null, id)
            .then(function(_transcription) {
              tx = _transcription;
            });
        });

        it('should include the transcription text among the attributes.', function(done) {
          handler({
            api_key: _.fake.API_KEY,
            short_url: 'https://peppermint.com/' + key,
          }, {
            succeed: function(res) {
              ok(res, upload.pathname, true, duration, tx.text);
              done();
            },
            fail: done,
          });
        });
      });
    });
  });
});

function ok(res, pathname, isComplete, duration, transcription) {
  expect(res.data).to.have.length(1);
  expect(res.data[0]).to.have.property('type', 'uploads');
  expect(res.data[0]).to.have.property('id', pathname);
  expect(res.data[0]).to.have.property('attributes');
  var attrs = res.data[0].attributes;
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
