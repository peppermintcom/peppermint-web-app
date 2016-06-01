//@flow
import {expect} from 'chai'
import fake from '../../../domain/fake'
import recorders from '../recorders'
import fixtures from './fixtures'

describe('dynamo recorders', function() {
  describe('save', function() {
    it('should save a Recorder.', function() {
      var recorder = fake.recorder();

      return recorders.save(recorder)
        .then(function(_r) {
          expect(_r).to.equal(recorder);
        });
    });
  });

  describe('read', function() {
    it('should restore a saved Recorder.', function() {
      return fixtures.recorder()
        .then(function(recorder) {
          return recorders.read(recorder.client_id)
            .then(function(_r) {
              expect(_r.recorder_id).to.equal(recorder.recorder_id)
              expect(_r.client_id).to.equal(recorder.client_id)
              expect(_r.api_key).to.equal(recorder.api_key)
              expect(_r.recorder_key_hash).to.equal(recorder.recorder_key_hash)
              expect(_r.registered).to.equal(recorder.registered)
              expect(_r.description).to.equal(recorder.description)
              expect(_r.gcm_registration_token).to.equal(recorder.gcm_registration_token)
            });
        });
    });
  });
});
