var expect = require('chai').expect;
var tv4 = require('tv4');
var spec = require('./spec');
var handler = require('../../../lambda/bundle').GetMessages;
var _ = require('utils/test');

var WEEK = 1000 * 60 * 60 * 24 * 7;
const begin = '2016-01-01 00:00:00';

describe('lambda:SearchMessages', function() {
  var sender;
  var recipient;
  var msgs;

  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.account(),
    ])
    .then(function(results) {
      sender = results[0];
      recipient = results[1];
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

  describe('no messages from sender', function() {
    it('should succeed with an empty collection', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + sender.at,
        sender_id: sender.account_id,
      }, {
        succeed: function(res) {
          expect(res).to.deep.equal({data: []});
          if (!tv4.validate(res, spec.responses['200'].schema)) {
            console.log(tv4.error);
            throw tv4.error;
          }
          done();
        },
        fail: done,
      });
    });
  });

  describe('sender has sent 3 read messages a week old and 1 unread new message', function() {
    var split = Date.now() - WEEK;
    var messages;

    before(function() {
      return _.fake.messages({
        sender: sender,
        before: split,
        read: 3,
      }, {
        sender: sender,
        after: split,
        unread: 1,
      })
      .then(function(data) {
        messages = data;
      });
    });

    describe('since=' + _.timestamp(split), function() {
      it('should return a collection with one message.', function(done) {
        handler({
          sender_id: sender.account_id,
          Authorization: 'Bearer ' + sender.at,
          since: _.timestamp(split),
          api_key: _.fake.API_KEY,
        }, {
          succeed: function(result) {
            resultOK(null, sender, null, result);
            done();
          },
          fail: done,
        });
      });
    });

    describe('sender parameter only', function() {
      it('should return a collection with four messages.', function(done) {
        handler({
          sender_id: sender.account_id,
          Authorization: 'Bearer ' + sender.at,
          api_key: _.fake.API_KEY,
        }, {
          succeed: function(result) {
            resultOK(null, sender, null, result);
            expect(result.data).to.have.length(4);
            done();
          },
          fail: done,
        });
      });
    });

    describe('one of the messages did not complete uploading', function() {
      before(function() {
        _.messages.update(messages[0].message_id, 'REMOVE handled');
      });

      it('should return a collection with three messages.', function(done) {
        handler({
          sender_id: sender.account_id,
          Authorization: 'Bearer ' + sender.at,
          api_key: _.fake.API_KEY,
        }, {
          succeed: function(result) {
            resultOK(null, sender, null, result);
            expect(result.data).to.have.length(3);
            done();
          },
          fail: done,
        });
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
      }, {
        recipient: recipient,
        unread: 1,
        after: split,
      })
      .then(function(data) {
        msgs = data;
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
            resultOK(null, null, recipient, res);
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
              resultOK(null, null, recipient, res);
              expect(res.data).to.have.length(3);
              _.each(res.data, function(msg) {
                expect(msg.attributes.transcription).to.be.undefined;
                expect(msg.attributes.duration).to.be.undefined;
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
        var text = _.token(8);

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

  describe('missing recipient_id and sender_id', function() {
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
          expect(JSON.parse(err.name)).to.have.property('detail', 'either recipient or sender must be specified');
          done();
        },
      });
    });
  });

  describe('included recipient_id and sender_id', function() {
    it('should fail with a 400 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + recipient.at,
        recipient_id: recipient.account_id,
        sender_id: recipient.account_id,
        since: '2016-01-01 00:00:00',
      }, {
        succeed: function() {
          done(new Error('success with both sender and recipient'));
        },
        fail: function(err) {
          expect(err.message).to.equal('400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'cannot query recipient and sender in the same call');
          done();
        }
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

  describe('with Authorization header for a different account than sender parameter', function() {
    it('should fail with a 403 error.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        sender_id: 'x' + recipient.account_id,
        Authorization: 'Bearer ' + recipient.at,
      }, {
        succeed: function(res) {
          done(new Error('success with wrong Authorization'));
        },
        fail: function(err) {
          expect(err.message).to.equal('403');
          expect(JSON.parse(err.name)).to.have.property('detail', 'not authenticated as sender');
          done();
        },
      });
    });
  });
});

function resultOK(id, sender, recipient, result) {
  if (!tv4.validate(result, spec.responses['200'].schema)) {
    _.log(result);
    throw tv4.error;
  }
  _.each(result.data, function(message) {
    expect(message).to.have.property('id');
    expect(message).to.have.property('type', 'messages');
    expect(message).to.have.property('attributes');
    expect(message.attributes).to.have.property('recipient_email');
    recipient && expect(message.attributes.recipient_email).to.equal(_.toLower(recipient.email));
    expect(message.attributes).to.have.property('sender_email')
    sender && expect(message.attributes.sender_email).to.equal(_.toLower(sender.email));
    expect(message.attributes).to.have.property('audio_url', _.fake.AUDIO_URL);
    expect(message.attributes).to.have.property('sender_name');
    sender && expect(message.attributes.sender_name).to.equal(sender.full_name);
  });
}
