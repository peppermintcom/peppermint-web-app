var fs = require('fs');
var expect = require('chai').expect;
var _ = require('utils/test');

describe('Postprocess putObject hook', function() {
  var recorder, upload;

  before(function() {
    return _.http('POST', '/recorder', {
        api_key: _.fake.API_KEY,
        recorder: {},
      })
      .then(function(response) {
        expect(response.statusCode).to.equal(201);
        recorder = response.body.recorder;
        recorder.at = response.body.at;
      });
  });

  before(function() {
    return _.http('POST', '/uploads', {
      content_type: 'audio/mp3',
    }, {
      'Authorization': 'Bearer ' + recorder.at,
    }).then(function(res) {
      expect(res.statusCode).to.equal(201);
      upload = res.body;
    });
  });

  before(function() {
    var data = fs.readFileSync(__dirname + '/sample.mp3');
    return _.http('PUT', upload.signed_url, data, {
        'Content-Type': 'audio/mp3',
        'Content-Length': '22032',
      })
      .then(function(response) {
        expect(response.statusCode).to.equal(200);
      });
  });

  it('should save the duration to the upload item within 10 seconds.', function(done) {
    this.timeout(15000);
    
    setTimeout(function() {
      _.uploads.getByURL(upload.canonical_url)
        .then(function(upload) {
          expect(upload).to.have.property('seconds', 6);
          expect(upload.created).to.be.ok;
          expect(upload.uploaded).to.be.ok;
          done();
        })
        .catch(done);
    }, 10000);
  });
});
