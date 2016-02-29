var expect = require('chai').expect;
var _ = require('utils/test');

describe('_.messages', function() {
  var sender = _.fake.user();
  var recipient = _.fake.user();
  var messages;

  describe('given there are 5 messages (3 unread) for the recipient', function() {
    before(function() {
      return _.fake.messages(recipient, 3, 2)
        .then(function(_messages) {
          messages = _messages;
        });
    });

    describe('query', function() {
      it('should return a message collection with five parsed items.', function() {
        return _.messages.query(recipient.email.toLowerCase())
          .then(function(data) {
            expect(data.Items).to.have.length(5);
            //2 should have read timestamp
            expect(_.filter(data.Items, function(msg) {
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
  });
});
