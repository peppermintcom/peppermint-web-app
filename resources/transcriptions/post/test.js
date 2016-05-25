var expect = require('chai').expect;
var _ = require('utils/test');
var handler = require('./').handler;

describe('lambda:CreateTranscription', function() {
  var recorderID = _.token(22);
  var base = _.token(22);
  var filename = base + '.m4a';
  var jwt = _.jwt.creds(null, recorderID);
  var Auth = 'Bearer ' + jwt;
  var body = {
    audio_url: ['http://go.peppermint.com', recorderID, filename].join('/'),
    language: 'en-US',
    confidence: 0.87,
    text: 'test message transcription',
  };

  describe('valid requests', function() {

    after(function() {
      return _.dynamo.del('transcriptions', {
        transcription_id: {S: base},
      });
    });

    it('should return the transcription.', function(done) {
      handler({
        'Content-Type': 'application/json',
        ip: '127.0.0.1',
        api_key: _.fake.API_KEY,
        Authorization: Auth,
        body: body,
      }, {
        succeed: function(t) {
          expect(t).to.have.property('transcription_url');
          expect(t.transcription_url).to.match(new RegExp(base));
          expect(t).to.have.property('audio_url', body.audio_url);
          expect(t).to.have.property('language', body.language);
          expect(t).to.have.property('confidence', body.confidence);
          expect(t).to.have.property('text', body.text);
          expect(t).to.have.property('timestamp');
          expect(t).to.have.property('ip_address');
          done();
        },
        fail: function(err) {
          done(new Error(err));
        },
      });
    });
  });

  describe('Bad Request', function() {
    describe('without audio_url in request body', function() {
      it('should fail with a Bad Request error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: Auth,
          'Content-Type': 'application/json',
          body: _.omit(body, 'audio_url'),
        }, {
          succeed: function() {
            done(new Error('success without audio_url'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*audio_url/);
            done();
          },
        });
      });
    });

    describe('with invalid audio_url in request body', function() {
      it('should fail with a Bad Request error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: Auth,
          'Content-Type': 'application/json',
          body: _.assign({}, body, {audio_url: 'http://go.peppermint.com/a.mp3'}),
        }, {
          succeed: function() {
            done(new Error('success with invalid audio_url'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*audio_url/);
            done();
          },
        });
      });
    });

    describe('without language in request body', function() {
      it('should fail with a Bad Request error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: Auth,
          'Content-Type': 'application/json',
          body: _.omit(body, 'language'),
        }, {
          succeed: function() {
            done(new Error('success without language'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*language/);
            done();
          },
        });
      });
    });

    describe('with invalid language in request body', function() {
      it('should fail with a Bad Request error.',  function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: Auth,
          'Content-Type': 'application/json',
          body: _.assign({}, body, {language: 'English US'}),
        }, {
          succeed: function() {
            done(new Error('success with invalid language'));
          },
          fail: function(err) {
            expect(err).to.match(/Bad Request.*language/);
            done();
          },
        });
      });
    });

    describe('without confidence in request body', function() {
      it('should fail with a Bad Request error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: Auth,
          'Content-Type': 'application/json',
          body: _.omit(body, 'confidence'),
        }, {
          succeed: function() {
            done(new Error('success without confidence'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*confidence/);
            done();
          },
        });
      });
    });

    describe('without text in request body', function() {
      it('should fail with a Bad Request error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: Auth,
          'Content-Type': 'application/json',
          body: _.omit(body, 'text'),
        }, {
          succeed: function() {
            done(new Error('success without text'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*text/);
            done();
          },
        });
      });
    });
  });

  describe('Unauthorized', function() {
    describe('without api_key', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          ip: '127.0.0.1',
          Authorization: Auth,
          'Content-Type': 'application/json',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success without api_key'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });

    describe('with unknown api_key', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          ip: '127.0.0.1',
          Authorization: Auth,
          'Content-Type': 'application/json',
          api_key: _.fake.API_KEY + 'x',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success without api_key'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });

    describe('without Authorization', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          body: body,
          'Content-Type': 'application/json',
        }, {
          succeed: function() {
            done(new Error('success without api_key'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });

    describe('with invalid Authorization', function() {
      it('should fail with an Unauthorized error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: Auth + 'x',
          'Content-Type': 'application/json',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success without api_key'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });
  });

  describe('Forbidden', function() {
    describe('with a jwt token not belonging to the owner of the audio_url', function() {
      it('should fail with a Forbidden error.', function(done) {
        handler({
          ip: '127.0.0.1',
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + _.jwt.creds(null, 'other'),
          'Content-Type': 'application/json',
          body: body,
        }, {
          succeed: function() {
            done(new Error('success without access'));
          },
          fail: function(err) {
            expect(err).to.match(/Forbidden/);
            done();
          }
        });
      });
    });
  });

  describe('wrong content-type', function() {
    it('should 415.', function(done) {
      handler({
        'Content-Type': 'application/vnd.api+json',
      }, {
        succeed: function() {
          done(new Error('success with wrong content-type'))
        },
        fail: function(err) {
          expect(err).to.match(/415/)
          done()
        },
      })
    })
  })
});
