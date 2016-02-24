var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

const begin = '2016-01-01 00:00:00';

describe('lambda:SearchMessages', function() {
  var sender = _.fake.user();
  var recipient;

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
          done();
        },
        fail: function(err) {
          done(err);
        },
      });
    });
  });

  describe('recipient has 2 messages from 2015 and 2 from 2016', function() {
    before(function() {
      var msgs = [{
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2015-12-31T12:59:59').valueOf(),
        message_id: _.token(22),
      }, {
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2015-12-31T12:59:59').valueOf(),
        message_id: _.token(22),
      }, {
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2016-01-01T00:00:01').valueOf(),
        message_id: _.token(22),
      }, {
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2016-01-01T00:00:01').valueOf(),
        message_id: _.token(22),
      }];

      return Promise.all(_.map(msgs, function(msg) {
        return _.messages.put(msg);
      }));
    });

    describe('without "since" parameter', function() {
      it('should return all messages.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + recipient.at,
          recipient_id: recipient.account_id,
        }, {
          succeed: function(res) {
            expect(res).to.have.property('data');
            expect(res.data).to.have.length(4);
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
