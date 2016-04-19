//@flow
import {expect} from 'chai'
import fake from '../../../utils/fake'
import fixtures from '../../../repository/dynamo/test/fixtures'
import token from '../../../utils/randomtoken'
import registerRecorder, {Errors} from '../registerRecorder'

describe('registerRecorder command', function() {
  describe('with minimum defined attributes', function() {
    it('should succeed with a Recorder and generated recorder_key.', function() {
      return registerRecorder({
        api_key: fake.API_KEY,
        client_id: null,
        recorder_key: null,
        description: null,
      })
      .then(function(res) {
        expect(res).to.have.property('recorder');
        expect(res.recorder).to.have.property('recorder_id');
        expect(res.recorder).to.have.property('api_key', fake.API_KEY);
        expect(res.recorder).to.have.property('client_id');
        expect(res.recorder).to.have.property('description', null);
        expect(res.recorder).not.to.have.property('recorder_key_hash');
        expect(res).to.have.property('recorder_key');
        expect(res).to.have.property('access_token');
      });
    });
  });

  describe('with maximum defined attributes', function() {
    it('should succeed with a Recorder.', function() {
      let req = {
        api_key: fake.API_KEY,
        client_id: token(12),
        recorder_key: token(12),
        description: 'test registerRecorder command',
      }

      return registerRecorder(req)
      .then(function(res) {
        expect(res).not.to.have.property('recorder_key');
        expect(res).to.have.property('recorder');
        expect(res.recorder).to.have.property('recorder_id');
        expect(res.recorder).to.have.property('api_key', req.api_key);
        expect(res.recorder).to.have.property('client_id', req.client_id);
        expect(res.recorder).to.have.property('description', req.description);
        expect(res.recorder).not.to.have.property('recorder_key_hash');
        expect(res).to.have.property('access_token');
      });
    });
  });

  describe('without a defined api_key', function() {
    it('should fail with Errors.APIKey.', function() {
      let req = {
        api_key: 'something',
        client_id: null,
        recorder_key: null,
        description: null,
      };

      return registerRecorder(req)
      .then(function() {
        throw new Error('success with invalid API key');
      })
      .catch(function(err) {
        expect(err).to.equal(Errors.APIKey);
      });
    });
  });

  describe('with an existing client_id defined', function() {
    it('should fail with Errors.Conflict.', function() {
      return fixtures.recorder()
        .then(function(recorder) {
          return registerRecorder({
            api_key: fake.API_KEY,
            client_id: recorder.client_id,
            recorder_key: null,
            description: recorder.description,
          })
          .then(function() {
            throw new Error('success with duplicate client_id');
          })
          .catch(function(err) {
            expect(err).to.equal(Errors.Conflict);
          });
        });
    });
  });
});
