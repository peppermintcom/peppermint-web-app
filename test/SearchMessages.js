var expect = require('chai').expect;
var _ = require('utils/test');

describe('GET /messages', function() {
  this.timeout(5 * 60 * 1000);
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

  describe('recipient received 80 messages in 2015 and 2 in 2016', function() {
    var messages;

    before(function() {
      var created = new Date('2015-12-01T12:00:00').valueOf();

      var msgs = _.map(_.range(80), function(i) {
        return {
          recipient_email: recipient.email,
          sender_email: _.fake.user().email,
          audio_url: _.fake.AUDIO_URL,
          created: created + i*1000,
          message_id: _.token(22),
        };
      });

      //2016 messages
      msgs.push({
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2016-01-01T00:00:01').valueOf(),
        message_id: _.token(22),
      });
      msgs.push({
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2016-01-01T00:00:02').valueOf(),
        message_id: _.token(22),
      });

      return Promise.all(_.map(msgs, function(msg) {
        return _.messages.put(msg);
      }));
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
          expect(res.body).not.to.have.property('links');
        });
      });
    });

    describe('?recipient=:id&since=2017-01-01 00:00:00', function() {
      it('should return no messages.', function() {

      });
    });

    describe('?recipient=:id', function() {
      it('should return 2 pages of 40 messages then 2 messages on the last page.', function() {
        var headers = {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + recipientJWT,
        };

        return _.http('GET', '/messages?recipient=' + recipient.account_id, null, headers)
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.length(40);
            expect(res.body).to.have.property('links');

            return _.http('GET', res.body.links.next, null, headers)
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.length(40);
            expect(res.body).to.have.property('links');

            return _.http('GET', res.body.links.next, null, headers)
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.length(2);
            expect(res.body).not.to.have.property('links');
          });
      });
    });
  });
});
