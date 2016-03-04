var expect = require('chai').expect;
var tv4 = require('tv4');
var spec = require('./spec');
var handler = require('./').handler;
var _ = require('utils/test');

const begin = '2016-01-01 00:00:00';

describe.only('lambda:SearchMessages', function() {
  var sender = _.fake.user();
  var recipient;
  var msgs;

  before(function() {
    return _.fake.account().then(function(account) {
      recipient = account;
    });
  });

  //valid, authenticated requests
  describe('no messages for recipient', function() {
    it('should succeed with an empty collection', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + recipient.at,
        recipient_id: recipient.account_id,
        since: begin,
      }, {
        succeed: function(res) {
          expect(res).to.deep.equal({data: []});
          if (!tv4.validate(res, spec.responses['200'].schema)) {
            console.log(tv4.error);
            throw tv4.error;
          }
          done();
        },
        fail: function(err) {
          done(err);
        },
      });
    });
  });

  describe('recipient has 2 read messages from 2015 and 1 unread from 2016', function() {
    var split = new Date('2016-01-01T00:00:00').valueOf();

    before(function() {
      return _.fake.messages({
        recipient: recipient,
        read: 2,
        before: split,
      })
      .then(function(data) {
        msgs = data;

        return _.fake.messages({
          recipient: recipient,
          unread: 1,
          after: split,
        });
      })
      .then(function(data) {
        msgs = msgs.concat(data);
      });
    });

    describe('since=2016-01-01 00:00:00', function() {
      it('should return one message from 2016', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + recipient.at,
          since: '2016-01-01 00:00:00',
          recipient_id: recipient.account_id,
        }, {
          succeed: function(res) {
            expect(res.data).to.have.length(1);
            _.each(res.data, function(msg) {
              expect(msg).to.have.property('id');
              expect(msg).to.have.property('type', 'messages');
              expect(msg.attributes).to.have.property('recipient_email', recipient.email.toLowerCase());
              expect(msg.attributes).to.have.property('audio_url', _.fake.AUDIO_URL);
              expect(msg.attributes.sender_name).to.be.ok;
            });
            done();
          },
          fail: function(err) {
            done(err);
          }
        });
      });
    });

    describe('without "since" parameter', function() {
      describe('without duration and transcription available', function() {
        before(function() {
          return Promise.all([
            _.transcriptions.updateByAudioURL(_.fake.AUDIO_URL, 'REMOVE #text', null, {
              '#text': 'text',
            }),
            _.uploads.updateByAudioURL(_.fake.AUDIO_URL, 'REMOVE seconds'),
          ]);
        });

        it('should return all messages with duration and transcription undefined.', function(done) {
          handler({
            api_key: _.fake.API_KEY,
            Authorization: 'Bearer ' + recipient.at,
            recipient_id: recipient.account_id,
          }, {
            succeed: function(res) {
              expect(res).to.have.property('data');
              expect(res.data).to.have.length(3);
              _.each(res.data, function(msg) {
                expect(msg).to.have.property('id');
                expect(msg).to.have.property('type', 'messages');
                expect(msg).to.have.property('attributes');
                expect(msg.attributes.transcription).to.be.undefined;
                expect(msg.attributes.duration).to.be.undefined;
                expect(msg.attributes.sender_name).to.be.ok;
              });
              expect(res.data[0].attributes).to.have.property('read');
              expect(res.data[1].attributes).to.have.property('read');
              expect(res.data[2].attributes).not.to.have.property('read');
              done();
            },
            fail: function(err) {
              done(err);
            },
          });
        });
      });

      describe('with duration and transcription available', function() {
        text = _.token(8);

        before(function() {
          return Promise.all([
            _.transcriptions.updateByAudioURL(_.fake.AUDIO_URL, 'SET #text = :text', {
              ':text': {S: text},
            }, {
              '#text': 'text',
            }),
            _.uploads.updateByAudioURL(_.fake.AUDIO_URL, 'SET seconds = :seconds', {
              ':seconds': {N: '6'},
            }),
          ]);
        });

        it('should return all messages and included duration and transcription.', function(done) {
          handler({
            api_key: _.fake.API_KEY,
            Authorization: 'Bearer ' + recipient.at,
            recipient_id: recipient.account_id,
          }, {
            succeed: function(res) {
              expect(res).to.have.property('data');
              expect(res.data).to.have.length(3);
              _.each(res.data, function(msg) {
                expect(msg).to.have.property('id');
                expect(msg).to.have.property('type', 'messages');
                expect(msg).to.have.property('attributes');
                expect(msg.attributes).to.have.property('transcription', text);
                expect(msg.attributes).to.have.property('duration', 6);
                expect(msg.attributes.sender_name).to.be.ok;
              });
              done();
            },
            fail: function(err) {
              done(err);
            },
          });
        });
      });
    });
  });

  describe('missing recipient_id', function() {
    it('should fail with a 400 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + recipient.at,
        recipient_id: undefined,
        since: '2016-01-01 00:00:00',
      }, {
        succeed: function() {
          done(new Error('success without recipient'));
        },
        fail: function(err) {
          expect(err.message).to.equal('400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'recipient not specified');
          done();
        },
      });
    });
  });

  describe('invalid since parameter', function() {
    it('should fail with a 400 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + recipient.at,
        recipient_id: recipient.account_id,
        since: 'all',
      }, {
        succeed: function(res) {
          done(new Error('success with invalid since parameter'));
        },
        fail: function(err) {
          expect(err.message).to.equal('400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'cannot parse since parameter')
          done();
        },
      });
    });
  });

  describe('without api_key', function() {
    it('should fail with a 400 error.', function(done) {
      handler({
        Authorization: 'Bearer ' + recipient.at,
        recipient_id: recipient.account_id,
      }, {
        succeed: function(res) {
          done(new Error('success without api_key'));
        },
        fail: function(err) {
          expect(err.message).to.equal('400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'invalid API Key');
          done();
        },
      });
    });
  });

  describe('with invalid api_key', function() {
    it('should fail with a 400 error.', function(done) {
      handler({
        api_key: 'x' + _.fake.API_KEY,
        Authorization: 'Bearer ' + recipient.at,
        recipient_id: recipient.account_id,
      }, {
        succeed: function(res) {
          done(new Error('success without api_key'));
        },
        fail: function(err) {
          expect(err.message).to.equal('400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'invalid API Key');
          done();
        },
      });
    });
  });

  describe('without Authorization', function() {
    it('should fail with a 401 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        recipient_id: recipient.account_id,
      }, {
        succeed: function(res) {
          done(new Error('success without Authorization'));
        },
        fail: function(err) {
          expect(err.message).to.equal('401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header should be formatted: Bearer <JWT>');
          done();
        },
      });
    });
  });

  describe('without Authorization', function() {
    it('should fail with a 401 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        recipient_id: recipient.account_id,
        Authorization: 'Bearer x' + recipient.at,
      }, {
        succeed: function(res) {
          done(new Error('success without Authorization'));
        },
        fail: function(err) {
          expect(err.message).to.equal('401');
          done();
        },
      });
    });
  });

  describe('with Authorization header for a different account than recipient parameter', function() {
    it('should fail with a 403 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        recipient_id: 'x' + recipient.account_id,
        Authorization: 'Bearer ' + recipient.at,
      }, {
        succeed: function(res) {
          done(new Error('success with wrong Authorization'));
        },
        fail: function(err) {
          expect(err.message).to.equal('403');
          expect(JSON.parse(err.name)).to.have.property('detail', 'not authenticated as recipient');
          done();
        },
      });
    });
  });
});
