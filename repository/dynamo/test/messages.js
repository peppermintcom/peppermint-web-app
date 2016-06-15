//@flow
import type {Message} from '../../../domain'
import type {QueryResult} from '../../types'

import {expect} from 'chai'
import fake from '../../../utils/fake'
import domain from '../../domain'
import messages from '../messages'
import fixtures from './fixtures'

import dynamo from '../client'

describe('dynamo messages repository', function() {
  describe('save', function() {
    var message;

    it('should save a message.', function() {
      return Promise.all([
        fixtures.account(),
        fixtures.account(),
        fixtures.upload(),
      ])
      .then(function(results) {
        message = domain.newMessage({
          sender: results[0],
          recipient: results[1],
          upload: results[2],
        });

        return messages.save(message);
      })
      .then(function(_m) {
        //returns the unchanged message
        expect(_m).to.equal(message);
      });
    });

    describe('duplicate with checkConflict option', function() {
      it('should fail to save with a conflict error.', function() {
        return messages.save(message, {checkConflict: true})
          .then(function() {
            throw new Error('saved dupe')
          })
          .catch(function(err) {
            expect(err.message).to.equal(domain.ErrConflict)
          })
      })
    })
  });

  describe('markRead', function() {
    it('should set the "read" attribute on a message', function() {
      let id
      let ts = Date.now()

      return fixtures.message({handled: true, read: false})
        .then(function(message) {
          id = message.message_id

          return messages.markRead(id, ts)
        })
        .then(function() {
          return messages.read(id)
        })
        .then(function(message) {
          expect(message).to.have.property('read', ts)
        })
    })
  })

  describe('read', function() {
    describe('message has minimum allowed attributes', function() {
      it('should restore the saved message.', function() {
        var message;

        return fixtures.message({handled: false, read: false})
          .then(function(_m) {
            message = _m;
            return messages.read(message.message_id);
          })
          .then(function(_m) {
            expectEqual(_m, message);
          });
      });
    });

    describe('message has all optional properties set', function() {
      it('should restore the full saved message.', function() {
        return fixtures.message({handled: true, read: true})
          .then(function(message) {
            return messages.read(message.message_id)
              .then(function(_m) {
                expectEqual(_m, message);
              });
          });
      });
    });
  });

  describe('query', function() {
    describe('bob sent ann 1 message yesterday', function() {
      var bob, ann, message;

      before(function() {
        return Promise.all([
          fixtures.account(),
          fixtures.account(),
        ])
        .then(function(results) {
          bob = results[0];
          ann = results[1];
        });
      });

      before(function() {
        return fixtures.message({
          sender: bob,
          recipient: ann,
          handled: true,
          read: false,
        })
        .then(function(_message) {
          message = _message;
        });
      });

      describe('query bob qua sender past week', function() {
        it('should return the message.', function() {
          return messages.queryEmail({
            email: bob.email,
            role: 'sender',
            order: 'reverse',
            start_time: Date.now() - (1000 * 60 * 60 * 24 * 7),
            end_time: Date.now(),
          }, {
            limit: 10,
          })
          .then(function(result) {
            expect(result).not.to.have.property('position');
            expect(result).to.have.property('entities');
            expect(result.entities).to.have.length(1);
            expectEqual(result.entities[0], message);
          });
        });
      });

      describe('query ann qua recipient past week', function() {
        it('should return the message.', function() {
          return messages.queryEmail({
            email: ann.email,
            role: 'recipient',
            order: 'reverse',
            start_time: Date.now() - (1000 * 60 * 60 * 24 * 7),
            end_time: Date.now(),
          }, {
            limit: 10,
          })
          .then(function(result) {
            expect(result).not.to.have.property('position')
            expect(result).to.have.property('entities')
            expect(result.entities).to.have.length(1)
            expectEqual(result.entities[0], message)
          });
        });
      });

      describe('query bob qua recipient past week', function() {
        it('should return an empty set.', function() {
          return messages.queryEmail({
            email: bob.email,
            role: 'recipient',
            order: 'reverse',
            start_time: Date.now() - (1000 * 60 * 60 * 24 * 7),
            end_time: Date.now(),
          }, {
            limit: 10
          })
          .then(function(result) {
            expect(result).to.deep.equal({entities: []})
          })
        })
      })

      describe('query ann qua recipient past week', function() {
        it('should return an empty set.', function() {
          return messages.queryEmail({
            email: ann.email,
            role: 'sender',
            order: 'reverse',
            start_time: Date.now() - (1000 * 60 * 60 * 24 * 7),
            end_time: Date.now(),
          }, {
            limit: 10,
          })
          .then(function(result) {
            expect(result).to.deep.equal({entities: []})
          })
        })
      })
    });
  });
});

function expectEqual(m1, m2) {
  expect(m1).to.have.property('message_id', m2.message_id);
  expect(m1).to.have.property('created', m2.created);
  expect(JSON.stringify(m1.upload)).to.equal(JSON.stringify({
    upload_id: m2.upload.upload_id,
    content_type: m2.upload.content_type,
    recorder: {
      recorder_id: m2.upload.recorder.recorder_id,
    },
  }));
  expect(m1.sender.email).to.equal(m2.sender.email)
  expect(m1.sender.full_name).to.equal(m2.sender.full_name)
  expect(m1.recipient.email).to.equal(m2.recipient.email)
  expect(m1).to.have.property('handled', m2.handled);
  expect(m1).to.have.property('handled_by', m2.handled_by);
  expect(m1).to.have.property('outcome', m2.outcome);
  expect(m1).to.have.property('read', m2.read);
}
