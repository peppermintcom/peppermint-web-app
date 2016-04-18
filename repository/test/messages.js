var expect = require('chai').expect;

describe('repository messages', function() {
  describe('factory', function() {
    describe('with optional sender_name attribute', function() {
      it('should return a new object with "created" and "message_id" properties set and "sender_email" and "recipient_email" lowercased.', function() {
        var bob = fixtures.user();
        var ann = fixtures.user();
        var attrs = {
          audio_url: fake.AUDIO_URL,
          recipient_email: ann.email,
          sender_email: bob.email,
          sender_name: bob.full_name,
        };
        var m: Message = messages.factory(attrs);

        expect(m).not.to.equal(attrs);
        expect(m).to.have.property('created');
        expect(m).to.have.property('message_id');
        expect(m).to.have.property('sender_email', bob.email.toLowerCase());
        expect(m).to.have.property('recipient_email', ann.email.toLowerCase());
        expect(m).to.have.property('sender_name', bob.full_name);
        expect(m).to.have.property('audio_url', fake.AUDIO_URL);
      });
    });

    describe('without sender_name attribute', function() {
      it('should return a new object with "created" and "message_id" properties set and "sender_email" and "recipient_email" lowercased.', function() {
        var bob = fixtures.user();
        var ann = fixtures.user();
        var attrs = {
          audio_url: fake.AUDIO_URL,
          recipient_email: ann.email,
          sender_email: bob.email,
        };
        var m: Message = messages.factory(attrs);

        expect(m).not.to.equal(attrs);
        expect(m).to.have.property('created');
        expect(m).to.have.property('message_id');
        expect(m).to.have.property('sender_email', bob.email.toLowerCase());
        expect(m).to.have.property('recipient_email', ann.email.toLowerCase());
        expect(m).to.have.property('audio_url', fake.AUDIO_URL);
        expect(m).not.to.have.property('sender_name');
      });
    });
  });
});
