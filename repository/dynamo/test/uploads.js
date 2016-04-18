//@flow
import {expect} from 'chai'
import domain from '../../domain'
import uploads from '../uploads'
import fixtures from './fixtures'

describe('dynamo uploads', function() {
  describe('save', function() {
    it('should save an Upload.', function() {
      return Promise.all([
        fixtures.recorder(),
        fixtures.account(),
      ])
      .then(function(results) {
        var upload = domain.newUpload({
          recorder: results[0],
          creator: results[1],
          content_type: 'audio/mp4',
        });

        return uploads.save(upload)
          .then(function(_u) {
            expect(_u).to.equal(upload);
          });
      });
    });
  });

  describe('read', function() {
    describe('minimum record', function() {
      it('should restore the Upload from dynamo.', function() {
        return fixtures.upload()
          .then(function(upload) {
            return uploads.read(upload.pathname())
              .then(function(_u) {
                expectEqual(_u, upload);
                expectEqual(upload, _u);
              });
          });
      });
    });

    describe('all optional properties set', function() {
      it('should restore the Upload from dynamo.', function() {
        return fixtures.account()
          .then(function(account) {
            return fixtures.upload(undefined, account);
          })
          .then(function(upload) {
            upload.duration = 6;
            upload.uploaded = Date.now();
            upload.postprocessed = Date.now();

            return uploads.save(upload);
          })
          .then(function(upload) {
            return uploads.read(upload.pathname())
              .then(function(_u) {
                expectEqual(_u, upload);
                expectEqual(upload, _u);
              });
          });
      });
    });
  });
});

function expectEqual(u1, u2) {
  expect(u1).to.have.property('upload_id', u2.upload_id);
  expect(u1).to.have.property('content_type', u2.content_type);
  expect(u1).to.have.property('initialized', u2.initialized);
  expect(u1).to.have.property('duration', u2.duration);
  expect(u1).to.have.property('postprocessed', u2.postprocessed);
  expect(u1).to.have.property('uploaded', u2.uploaded);
  expect(u1.recorder).to.have.property('recorder_id', u2.recorder.recorder_id);
  if (u1.creator) {
    expect(u1.creator).to.have.property('email', u2.creator && u2.creator.email);
  } else {
    expect(u2.creator).not.to.be.ok;
  }
  if (u1.transcription) {
    expect(u1.transcription).to.have.property('text', u2.transcription && u2.transcription.text);
  } else {
    expect(u2.transcription).not.to.be.ok;
  }
}
