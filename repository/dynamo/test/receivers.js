import {expect} from 'chai'
import receivers from '../receivers'

describe('receivers', function() {
  describe('save', function() {
    it('should save.', function() {
      return receivers.save('a', 'b')
        .then(function(r) {
          expect(r).to.deep.equal({
            recorder_id: 'a',
            account_id: 'b',
          })
        })
    })
  })

  describe('recorder_ids', function() {
    it('should return a list of recorder ids', function() {
      return receivers.save('a', 'b')
        .then(function() {
          return receivers.recorder_ids('b')
            .then(function(recorders) {
              expect(recorders).to.deep.equal(['a'])
            })
        })
    })
  })
})
