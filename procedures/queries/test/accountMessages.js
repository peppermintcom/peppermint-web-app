//@flow

import {expect} from 'chai'
import fixtures from '../../test/fixtures'
import accountMessages from '../accountMessages'

describe('query account messages', function() {
  describe('bob has sent ann 1 message; frank has sent bob 1 message', function() {
    var bob, ann, frank;

    //accounts
    before(function() {
      return Promise.all([
        fixtures.account(),
        fixtures.account(),
        fixtures.account,
      ])
      .then(function(accounts) {
        bob = accounts[0][0]
        ann = accounts[1][0]
        frank = accounts[2][0]
      })
    })

    //messages
    before(function() {
      return Promise.all([
        fixtures.messages({
          sender: bob,
          recipient: ann,
          read_count: 0,
          handled_count: 1,
        }),
        fixtures.messages({
          sender: frank,
          recipient: bob,
          read_count: 1,
          handled_count: 1,
        })
      ])
    })
      
    describe('query bob', function() {
      it('should return 1 message in the sender result set and 1 message in the recipient result set.', function() {
        return accountMessages({
          email: bob.email,
          start_time: Date.now() - (1000 * 60 * 60 * 24 * 7),
          end_time: Date.now(),
          limit: 10,
        })
        .then(function(result) {
          expect(result.sender.entities).to.have.length(1)
          expect(result.sender.entities[0].upload).to.have.property('duration')
          expect(result.sender.entities[0].upload.transcription).to.equal(null)
          expect(result.recipient.entities).to.have.length(1)
        })
      })
    })
  })
})
