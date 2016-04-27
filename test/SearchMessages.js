var expect = require('chai').expect;
var spec = require('../resources/messages/get/spec');
var _ = require('./utils');

describe('GET /messages', function() {
  this.timeout(5 * 60 * 1000);
  var sender = _.fake.user();
  var recipient;
  var recipientJWT;
  var get;
  
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

  //delete the fake messages
  after(function() {
    //return _.messages.delByAudioURL(_.fake.AUDIO_URL);
  });

  describe('sender sent 42 messages in the past month', function() {
    var senderJWT;

    before(function() {
      return _.fake.account().then(function(account) {
        sender = account;

        return _.http('POST', '/jwts', null, {
          Authorization: _.peppermintScheme(null, null, sender.email, sender.password),
          'X-Api-Key': _.fake.API_KEY,
        });
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(200);
        senderJWT = res.body.data.attributes.token;
      });
    });

    before(function() {
      return _.fake.messages({
        sender: sender,
        read: 30,
        unread: 12,
      })
      .then(function(data) {
        messages = data;
      });
    });

    it('should return all 42 messages over 2 calls.', function() {
      return _.http('GET', '/messages?limit=40&sender=' + sender.account_id + '&since=' + encodeURIComponent('2016-01-01 00:00:00'), null, {
        'X-Api-Key': _.fake.API_KEY,
        Authorization: 'Bearer ' + senderJWT,
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.have.property('data');
        expect(res.body.data).to.have.length(40);
        expect(res.body).to.have.property('links');
        res.body.data.forEach(function(message) {
          expect(message.attributes).to.have.property('sender_name', sender.full_name);
        });

        return _.http('GET', res.body.links.next, null, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + senderJWT,
        });
      })
      .then(function(res) {
        expect(res.statusCode).to.equal(200);
        expect(res.body.data).to.have.length(2);
        expect(res.body).not.to.have.property('links');
      });
    });
  });

  describe('recipient received 80 messages in 2015 and 2 in 2016', function() {
    var messages;
    var messages2016 = [_.token(22), _.token(22)];

    before(function() {
      var created = new Date('2015-12-01T12:00:00').valueOf();

      messages = _.map(_.range(80), function(i) {
        return {
          recipient_email: recipient.email,
          sender_email: _.fake.user().email,
          sender_name: sender.full_name,
          audio_url: _.fake.AUDIO_URL,
          created: created + i*1000,
          message_id: _.token(22),
          handled: Date.now(),
        };
      });

      //2016 messages
      messages.push({
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        sender_name: sender.full_name,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2016-01-01T00:00:01').valueOf(),
        message_id: messages2016[0],
        handled: Date.now(),
      });
      messages.push({
        recipient_email: recipient.email,
        sender_email: _.fake.user().email,
        sender_name: sender.full_name,
        audio_url: _.fake.AUDIO_URL,
        created: new Date('2016-01-01T00:00:02').valueOf(),
        message_id: messages2016[1],
        handled: Date.now(),
      });

      return Promise.all(_.map(messages, function(msg) {
        return _.messages.put(msg);
      }))
    });

    describe('?recipient=:id&since=2016-01-01 00:00:00', function() {
      describe('first message from 2016 has been read', function() {
        before(function() {
          return _.http('POST', '/reads', {data: {id: messages2016[0], type: 'reads'}}, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + recipientJWT,
            'Content-Type': 'application/vnd.api+json',
          })
          .then(function(response) {
            expect(response.statusCode).to.equal(204);
          });
        });

        it('should return 2 messages, one with a read timestamp.', function() {
          return _.http('GET', '/messages?limit=40&recipient=' + recipient.account_id + '&since=' + encodeURIComponent('2016-01-01 00:00:00'), null, {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + recipientJWT,
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.length(2);
            expect(res.body).not.to.have.property('links');
            expect(res.body.data[0].attributes).to.have.property('read');
            res.body.data.forEach(function(datum) {
              expect(datum.attributes).to.have.property('sender_name', sender.full_name);
            });
          });
        });
      });
    });

    describe.only('?recipient=:id&since=2017-01-01 00:00:00', function() {
      it('should return no messages.', function() {
        return _.http('GET', '/messages?limit=40&recipient=' + recipient.account_id + '&since=' + encodeURIComponent('2017-01-01 00:00:00'), null, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + recipientJWT,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body.data).to.have.length(0);
          expect(res.body).not.to.have.property('links');
        });
      });
    });

    describe('?recipient=:id', function() {
      it('should return 2 pages of 40 messages then 2 messages on the last page.', function() {
        var headers = {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + recipientJWT,
        };

        return _.http('GET', '/messages?limit=40&recipient=' + recipient.account_id, null, headers)
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.length(40);
            expect(res.body).to.have.property('links');
            res.body.data.forEach(function(message) {
              expect(message.attributes).to.have.property('sender_name', sender.full_name);
            });

            return _.http('GET', res.body.links.next, null, headers)
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.length(40);
            expect(res.body).to.have.property('links');
            res.body.data.forEach(function(message) {
              expect(message.attributes).to.have.property('sender_name', sender.full_name);
            });

            return _.http('GET', res.body.links.next, null, headers)
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.have.property('data');
            expect(res.body.data).to.have.length(2);
            expect(res.body).not.to.have.property('links');
            res.body.data.forEach(function(message) {
              expect(message.attributes).to.have.property('sender_name', sender.full_name);
            });
          });
      });

      describe('first 5 messages from 2015 have incomplete uploads', function() {
        before(function() {
          return Promise.all(messages.slice(0,5).map(function(message) {
            return _.messages.update(message.message_id, 'REMOVE handled');
          }));
        });

        it('should return 77 messages.', function() {
          var headers = {
            'X-Api-Key': _.fake.API_KEY,
            Authorization: 'Bearer ' + recipientJWT,
          };

          return _.http('GET', '/messages?&recipient=' + recipient.account_id, null, headers)
            .then(function(res) {
              expect(res.statusCode).to.equal(200);
              expect(res.body.data).to.have.length(77);
              expect(res.body).not.to.have.property('links');
            });
        });
      });
    });

    describe('one of the messages from 2016 is for an upload that did not complete', function() {
      before(function() {
        return _.messages.update(messages2016[0], 'REMOVE handled');
      });

      it('should return 1 message for 2016.', function() {
        return _.http('GET', '/messages?limit=40&recipient=' + recipient.account_id + '&since=' + encodeURIComponent('2016-01-01 00:00:00'), null, {
          'X-Api-Key': _.fake.API_KEY,
          Authorization: 'Bearer ' + recipientJWT,
        })
        .then(function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body.data).to.have.length(1);
          expect(res.body.data[0].id).to.equal(messages2016[1]);
        });
      });
    });
  });

  describe('common client errors', function() {
    _.clientErrors(spec, function() {
      return {
        method: 'GET',
        url: '/messages?recipient=' + recipient.account_id,
        headers: {
          Authorization: 'Bearer ' + recipientJWT,
          'X-Api-Key': _.fake.API_KEY,
          Accept: 'application/vnd.api+json',
        },
      };
    });
  });

  describe.skip('since parameter is malformed', function() {
    _.fail(400, 'cannot parse since parameter', spec, function() {
      return {
        method: 'GET',
        url: '/messages?recipient=' + recipient.account_id + '&since=any',
        headers: {
          Authorization: 'Bearer ' + recipientJWT,
          'X-Api-Key': _.fake.API_KEY,
          Accept: 'application/vnd.api+json',
        },
      };
    });
  });

  describe('Authorization header does not authenticate recipient', function() {
    _.fail(403, 'Forbidden', spec, function() {
      return {
        method: 'GET',
        url: '/messages?recipient=' + recipient.account_id + 'x',
        headers: {
          Authorization: 'Bearer ' + recipientJWT,
          'X-Api-Key': _.fake.API_KEY,
          Accept: 'application/vnd.api+json',
        },
      };
    });
  });
});
