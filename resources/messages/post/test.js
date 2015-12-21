var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe.only('lambda:CreateMessage', function() {
  describe('Api Key errors', function() {
    describe('without an api_key field', function() {
      it('should fail with a "Bad Request" message', function(done) {
        handler({
          Authorization: 'Bearer xxx',
          ip: '127.0.0.1',
          body: {},
        }, {
          succeed: function() {
            throw new Error('success without API Key');
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request/);
            done();
          },
        });
      });
    });

    describe('with an unknown api_key', function() {
      it('should fail with a "Bad Request" message', function(done) {
        handler({
          Authorization: 'Bearer xxx',
          ip: '127.0.0.1',
          body: {},
          api_key: 'xyz123',
        }, {
          succeed: function() {
            throw new Error('success without API Key');
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request/);
            done();
          },
        });
      });
    });
  });

  describe('Unauthorized requests', function() {
    describe('without any "Authorization" field', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          body: {},
          api_key: _.fake.API_KEY,
        }, {
          succeed: function() {
            done(new Error('success without "Authorization" field'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });

    describe('with a mal-formed "Authorization" field', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          body: {},
          api_key: _.fake.API_KEY,
          Authorization: 'xxx',
        }, {
          succeed: function() {
            done(new Error('success with mal-formed "Authorization" field'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });

    describe('with a mal-formed JWT in the "Authorization" field', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          body: {},
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer xxx',
        }, {
          succeed: function() {
            done(new Error('success with mal-formed JWT'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });

    describe('with an expired JWT', function() {
      it('should fail with an "Unauthorized" message', function(done) {
        handler({
          body: {},
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + _.jwt.encode('a@exmaple.com', -1),
        }, {
          succeed: function() {
            done(new Error('success with expired JWT'));
          },
          fail: function(err) {
            expect(err).to.match(/^Unauthorized/);
            done();
          },
        });
      });
    });
  });

  describe('Missing fields in body', function() {
    describe('audio_url', function() {
      it('should fail with a "Bad Request" message', function(done) {
        handler({
          body: {
            sender_email: 'a@example.com',
            recipient_email: 'b@example.com',
          },
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + _.jwt.encode('a@example.com', 5),
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

    describe('sender_email', function() {
      it('should fail with a "Bad Request" message', function(done) {
        handler({
          body: {
            audio_url: 'http://go.peppermint.com',
            recipient_email: 'b@example.com',
          },
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + _.jwt.encode('a@example.com', 5),
        }, {
          succeed: function() {
            done(new Error('success without sender_email'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*sender_email/);
            done();
          },
        });
      });
    });

    describe('recipient_email', function() {
      it('should fail with a "Bad Request" message', function(done) {
        handler({
          body: {
            audio_url: 'http://go.peppermint.com',
            sender_email: 'a@example.com',
          },
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + _.jwt.encode('a@example.com', 5),
        }, {
          succeed: function() {
            done(new Error('success without recipient_email'));
          },
          fail: function(err) {
            expect(err).to.match(/^Bad Request.*recipient_email/);
            done();
          },
        });
      });
    });
  });
});
