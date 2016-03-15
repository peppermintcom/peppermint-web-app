var expect = require('chai').expect;
var _ = require('utils/test');

describe('_.messages', function() {
  this.timeout(60000);
  var sender = _.fake.user();
  var recipient = _.fake.user();
  var messages;

  //delete the fake messages
  after(function() {
    return _.messages.delByAudioURL(_.fake.AUDIO_URL);
  });

  describe('given that there are 5 messages (2 unread) for the sender', function() {
    before(function() {
      return _.fake.messages({
        sender: sender,
        read: 3,
        unread: 2,
      })
      .then(function(_messages) {
        messages = _messages;
      });
    });

    it('should return a message collection with five parsed items.', function() {
      return _.messages.querySender(sender.email)
        .then(function(data) {
          expect(data.messages).to.have.length(5);
          expect(data.cursor).to.be.undefined;
          var readMessages = _.filter(data.messages, function(message) {
            return !!message.read;
          });
          expect(readMessages).to.have.length(3);
        });
    });

    describe('given there are 42 messages for the sender, 1 with an incomplete upload', function() {
      //If the incomplete upload is in the first result set, the first query
      //will return 39 messages, which is below the limit. The query will be run
      //again and the remaining 2 messages will be included in the final result.
      before(function() {
        return _.fake.messages({
          sender: sender,
          read: 37,
        })
        .then(function(_messages) {
          messages = messages.concat(_messages);

          return _.messages.update(messages[0].message_id, 'REMOVE handled');
        });
      });

      it('should return a message collection with 41 parsed items.', function() {
        return _.messages.querySender(sender.email)
          .then(function(data) {
            expect(data.messages).to.have.length(41);
            expect(data.cursor).to.be.undefined;
          });
      });
    });
  });

  describe('given there are 5 messages (3 unread) for the recipient', function() {
    before(function() {
      return _.fake.messages({
        recipient: recipient,
        read: 2,
        unread: 3
      })
      .then(function(_messages) {
        messages = _messages;
      });
    });

    describe('queryRecipient', function() {
      it('should return a message collection with five parsed items.', function() {
        return _.messages.queryRecipient(recipient.email.toLowerCase())
          .then(function(data) {
            expect(data.messages).to.have.length(5);
            //2 should have read timestamp
            expect(_.filter(data.messages, function(msg) {
              return !!msg.read;
            })).to.have.length(2);
          });
      });
    });

    describe('recentUnread', function() {
      it('should return messages from the past month without a read timestamp.', function() {
        return _.messages.recentUnread(recipient.email.toLowerCase())
          .then(function(messages) {
            expect(messages).to.have.length(3);
          });
      });
    });

    describe('recentUnreadCount', function() {
      describe('no messageID argument', function() {
        it('should return 3.', function() {
          return _.messages.recentUnreadCount(recipient.email.toLowerCase())
            .then(function(count) {
              expect(count).to.equal(3);
            });
        });

      });

      describe('messageID of message not in result set', function() {
        it('should return 4.', function() {
          var readMsg = _.find(messages, function(message) {
            return !!message.read;
          });

          return _.messages.recentUnreadCount(recipient.email.toLowerCase(), readMsg.message_id)
            .then(function(count) {
              expect(count).to.equal(4);
            });
        });
      });

      describe('messageID of message not in result set', function() {
        it('should return 3.', function() {
          var unreadMsg = _.find(messages, function(message) {
            return !message.read;
          });

          return _.messages.recentUnreadCount(recipient.email.toLowerCase(), unreadMsg.message_id)
            .then(function(count) {
              expect(count).to.equal(3);
            });
        });
      });
    });
  });
});
