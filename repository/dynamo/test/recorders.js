//@flow
import {expect} from 'chai'
import fake from '../../../utils/fake'
import {newRecorder} from '../../domain'
import {save, read} from '../recorders'
import fixtures from './fixtures'

describe('dynamo recorders', function() {
  describe('save', function() {
    it('should save a Recorder.', function() {
      var recorder = newRecorder({
        api_key: fake.API_KEY,
        recorder_key_hash: 'secret',
      });

      return save(recorder)
        .then(function(_r) {
          expect(_r).to.equal(recorder);
        });
    });
  });

  describe('read', function() {
    it('should restore a saved Recorder.', function() {
      return fixtures.recorder()
        .then(function(recorder) {
          return read(recorder.client_id)
            .then(function(_r) {
              expect(_r).to.deep.equal(recorder);
            });
        });
    });
  });
});
