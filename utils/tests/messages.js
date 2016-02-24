var expect = require('chai').expect;
var _ = require('utils/test');

describe('_.messages', function() {
  var sender = _.fake.user();
  var recipient = _.fake.user();
  var message;

  before(function() {
    message = _.messages.create({
      sender_email: sender.email,
      audio_url: _.fake.AUDIO_URL,
      recipient_email: recipient.email,
    });

    return _.messages.put(message);
  });

  describe('query', function() {
    describe('given there is one message for the recipient', function() {
      it('should return a message collection with one parsed item.', function() {
        return _.messages.query(message.recipient_email, 0)
          .then(function(messages) {
            expect(messages).to.have.length(1);
            expect(messages[0]).to.have.property('message_id', message.message_id);
          });
      });
    });
  });
});
