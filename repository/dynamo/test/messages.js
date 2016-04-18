//@flow
import type {Message} from '../../domain'
import type {QueryResult} from '../../types'

import {expect} from 'chai'
import fake from '../../../utils/fake'
import domain from '../../domain'
import messages from '../messages'
import fixtures from './fixtures'

import dynamo from '../client'

describe('dynamo messages repository', function() {
  describe('save', function() {
    it('should save a message.', function() {
      var message;

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
  });

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
});

function expectEqual(m1, m2) {
  expect(m1).to.have.property('message_id', m2.message_id);
  expect(m1).to.have.property('created', m2.created);
  expect(JSON.stringify(m1.upload)).to.equal(JSON.stringify({
    upload_id: m2.upload.upload_id,
    recorder: {
      recorder_id: m2.upload.recorder.recorder_id,
    },
  }));
  expect(m1.sender).to.deep.equal({
    email: m2.sender.email,
    full_name: m2.sender.full_name,
  });
  expect(m1.recipient).to.deep.equal({
    email: m2.recipient.email,
  });
  expect(m1).to.have.property('handled', m2.handled);
  expect(m1).to.have.property('handled_by', m2.handled_by);
  expect(m1).to.have.property('outcome', m2.outcome);
  expect(m1).to.have.property('read', m2.read);
}
