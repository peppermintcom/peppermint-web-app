var expect = require('chai').expect;
var handler = require('.').handler;
var _ = require('utils/test');

describe('lambda:RemoveAccountReceiver', function() {
  var account, recorder;

  before(function() {
    return Promise.all([
        _.fake.account(),
        _.fake.recorder2(),
      ])
      .then(function(results) {
        account = results[0];
        recorder = results[1];
      });
  });

  describe('relationship does not exist', function() {
    it('should succeed.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + recorder.at,
        account_id: account.account_id,
        recorder_id: recorder.recorder_id,
      }, {
        succeed: function(response) {
          expect(response).to.be.undefined;
          done();
        },
        fail: done,
      });
    });

    describe('unauthenticated', function() {
      it('should fail with a 401 error.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          account_id: account.account_id,
          recorder_id: recorder.recorder_id,
        }, {
          succeed: function() {
            done(new Error('success without Authorization'));
          },
          fail: function(err) {
            expect(err).to.have.property('message');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header should be formatted: Bearer <JWT>');
            done();
          },
        });
      });
    });

    describe('authenticated for account only', function() {
      it('should fail with a 403 error.', function() {
        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + account.at,
          account_id: account.account_id,
          recorder_id: recorder.recorder_id,
        }, {
          succeed: function() {
            done(new Error('success without recorder authentication'));
          },
          fail: function(err) {
            expect(err).to.have.property('message', '403');
            expect(JSON.parse(err.name)).to.have.property('detail', 'Recorder not authenticated');
          },
        });
      });
    });
  });

  describe('relationship exists', function() {
    before(function() {
      return _.receivers.link(recorder.recorder_id, account.account_id);
    });

    it('should succeed.', function(done) {
      handler({
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + recorder.at,
        account_id: account.account_id,
        recorder_id: recorder.recorder_id,
      }, {
        succeed: function(response) {
          expect(response).to.be.undefined;
          done();
        },
        fail: done,
      });
    });

    it('should delete the relationship in the database.', function() {
      return _.receivers.get(recorder.recorder_id, account.account_id)
        .then(function(record) {
          expect(record).not.to.be.ok;
        });
    });
  });
});
