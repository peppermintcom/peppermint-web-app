var expect = require('chai').expect;
var _ = require('utils/test');

describe.only('GET /messages', function() {
  var recipient;
  var recipientJWT;
  
  //setup recipient
  before(function() {
    return _.fake.account().then(function(account) {
      recipient = account;

      return _.http('POST', '/jwts', null, {
        Authorization: _.peppermintScheme(null, null, recipient.email, recipient.password),
        'X-Api-Key': _.fake.API_KEY,
      });
    })
    .then(function(res) {
      expect(res.statusCode).to.equal(200);
      recipientJWT = res.body.data.attributes.token;
    });
  });

  describe('recipient received 2 messages in 2015 and 2 in 2016', function() {
    var messages;

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

    describe('?recipient=:id', function() {
      it('should return 4 messages.', function() {
        return _.http('GET', '/messages?recipient=' + recipient.account_id, null, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + recipientJWT,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.length(4);
        });
      });
    });

    describe('?recipient=:id&since=2016-01-01 00:00:00', function() {
      it('should return 2 messages.', function() {
        return _.http('GET', '/messages?recipient=' + recipient.account_id + '&since=' + encodeURIComponent('2016-01-01 00:00:00'), null, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + recipientJWT,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.length(2);
        });
      });
    });
  });
});
