import {expect} from 'chai'
import fixtures from '../fixtures'
import token from '../../utils/randomtoken'
import uploads from '../uploads'

describe('repository uploads', function() {
  describe('update', function() {
    it('should save the properties to the upload.', function() {
      return fixtures.upload().then(function(upload) {
        return uploads.update(upload.pathname(), {
          postprocessed: Date.now(),
          uploaded: Date.now() - 500,
          seconds: 6,
        })
      })
      .then(function(upload) {
        expect(upload.postprocessed).to.be.ok
        expect(upload.uploaded).to.be.ok
        expect(upload.duration).to.equal(6)
      })
    })
  })

  describe('addPendingMessageID', function() {
    describe('not postprocessed', function() {
      it('should save the pending message.', function() {
        return fixtures.upload().then(function(upload) {
          let msgID = token(22)

          return uploads.addPendingMessageID(upload.pathname(), msgID)
            .then(function(upload) {
              expect(upload).to.be.ok
              expect(upload.pending_message_ids).to.deep.equal([msgID])

              return uploads.read(upload.pathname())
            })
            .then(function(upload) {
              expect(upload.pending_message_ids).to.deep.equal([msgID])
            })
        })
      })

      it('should save another and preserve the first.', function() {
        let msgID1 = token(22)
        let msgID2 = token(22)

        return fixtures.upload()
          .then(function(upload) {
            return uploads.addPendingMessageID(upload.pathname(), msgID1)
          })
          .then(function(upload) {
            return uploads.addPendingMessageID(upload.pathname(), msgID2)
          })
          .then(function(upload) {
            expect(upload).to.be.ok
            expect(upload.pending_message_ids).to.have.length(2)
            expect(upload.pending_message_ids.indexOf(msgID1)).not.to.equal(-1)
            expect(upload.pending_message_ids.indexOf(msgID2)).not.to.equal(-1)
            
            return uploads.read(upload.pathname())
          })
          .then(function(upload) {
            expect(upload.pending_message_ids).to.have.length(2)
            expect(upload.pending_message_ids.indexOf(msgID1)).not.to.equal(-1)
            expect(upload.pending_message_ids.indexOf(msgID2)).not.to.equal(-1)
          })
      })
    })

    describe('postprocessed', function() {
      it('should not save the pending message.', function() {
        return fixtures.upload({postprocessed: true}).then(function(upload) {
          let msgID = token(22)

          return uploads.addPendingMessageID(upload.pathname(), msgID)
            .then(function(_upload) {
              expect(_upload).to.equal(null)

              return uploads.read(upload.pathname())
            })
            .then(function(upload) {
              expect(upload.pending_message_ids).to.deep.equal([])
            })
        })
      })
    })
  })
})
