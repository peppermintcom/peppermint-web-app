import {expect} from 'chai'
import fixtures from '../../repository/fixtures'
import {ReadThrough} from '../bundle'

describe('lambda:ReadThrough', function() {
  describe('recipient has one unread message', function() {
    it('should mark the message as read', function() {
      let ann

      return fixtures.account()
        .then(function(account) {
          ann = account

          ann.Authorization = 'Bearer ' + fixtures.jwt(ann.account_id)

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
          })
        })
    })
  })
})
