import {expect} from 'chai'
import fixtures from '../../repository/fixtures'
import {ReadThrough} from '../bundle'

describe('lambda:ReadThrough', function() {
  describe('recipient has one unread message', function() {
    it('should mark the message as read', function(done) {
      let ann, bob

      Promise.all([
        fixtures.account(),
        fixtures.account(),
      ])
      .then(function(results) {
        ann = results[0]
        bob = results[1]

        ann.Authorization = 'Bearer ' + fixtures.jwt(ann.account_id)
        bob.Authorization = 'Bearer ' + fixtures.jwt(bob.account_id)

        return fixtures.messages({
          handled_count: 1,
          recipient: ann,
        })
      })
      .then(function(messages) {
        return ReadThrough({
          Authorization: ann.Authorization,
          'Content-Type': 'application/vnd.api+json',
          api_key: fixtures.API_KEY,
          body: {
            data: {
              type: 'reads',
              id: messages[0].message_id
            },
          }
        }, null, done)
      })
    })
  })
})
