//@flow
import {expect} from 'chai'
import fake from '../../fake'
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
              expect(_r).to.deep.equal(recorder);
            });
        });
    });
  });
});
