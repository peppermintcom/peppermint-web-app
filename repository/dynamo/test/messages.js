//@flow
import type {Message} from '../../domain'
import type {QueryResult} from '../types'

import {expect} from 'chai'
import fake from '../../../utils/fake'
import messages from '../messages'
import fixtures from './fixtures'
import _ from 'utils'

describe.only('dynamo messages repository', function() {
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

  describe('save', function() {
    it('should persist a message.', function() {
      var bob = fixtures.user();
      var ann = fixtures.user();
      var m: Message = messages.factory({
        sender_email: bob.email,
        sender_name: bob.full_name,
        recipient_email: ann.email,
        audio_url: fake.AUDIO_URL,
      });

      return messages.save(m)
        .then(function(_m) {
          //returns the unchanged message
          expect(_m).to.equal(m);
        });
    });
  });

  describe('read', function() {
    describe('message has minimum allowed attributes', function() {
      it('should restore the saved message.', function() {
        var bob = fixtures.user();
        var ann = fixtures.user();
        var m: Message = messages.factory({
          sender_email: bob.email,
          recipient_email: ann.email,
          audio_url: fake.AUDIO_URL,
        });

        return messages.save(m)
          .then(function() {
            return messages.read(m.message_id);
          })
          .then(function(_m) {
            expect(_m).to.deep.equal(m);
          });
      });
    });

    describe('message has all optional properties set', function() {
      it('should restore the full saved message.', function() {
        var bob = fixtures.user();
        var ann = fixtures.user();
        var m: Message = messages.factory({
          sender_email: bob.email,
          recipient_email: ann.email,
          audio_url: fake.AUDIO_URL,
          sender_name: bob.full_name,
        });
        m.handled = Date.now();
        m.handled_by = 'me';
        m.outcome = 'success';
        m.read = Date.now();

        return messages.save(m)
          .then(function() {
            return messages.read(m.message_id);
          })
          .then(function(_m) {
            expect(_m).to.deep.equal(m);
          });
      });
    });
  });

  describe('query', function() {
    describe('sender email', function() {
      describe('Bob has sent 41 messages.', function() {
        var bob, ann, list;

        before(function() {
          bob = fixtures.user();
          ann = fixtures.user();

          return Promise.all(_.range(41).map(function() {
              return fixtures.message({sender: bob, handled: true});
            }))
            .then(function(messages) {
              list = messages;
            });
        });

        it('should return the most recent 40 messages Sam sent and an offset pointing to the next page.', function() {
          var request = {
            email: bob.email,
            role: 'sender',
          };

          return messages.query(request)
            .then(function(result: QueryResult) {
              expect(result.entities.length).to.equal(40);
              expect(result).to.have.property('next');
            });
        });
      });
    });
  });
});
