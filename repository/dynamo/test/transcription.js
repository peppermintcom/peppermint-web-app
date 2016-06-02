import {expect} from 'chai'
import fixtures from '../../fixtures'
import transcriptions from '../transcriptions'

describe('transcriptions', function() {
  describe('read', function() {
    it('should restore the transcription.', function() {
      return fixtures.upload({transcription: true}).then(function(upload) {
        return transcriptions.read(upload.upload_id)
          .then(function(tx) {
            console.log(tx)
          })
        })
    })
  })
})
