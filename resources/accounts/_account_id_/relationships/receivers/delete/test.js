var expect = require('chai').expect;
var handler = require('.').handler;
var _ = require('utils/test');

describe('lambda:RemoveAccountReceiver', function() {
  var account, recorder, body;

  before(function() {
    return Promise.all([
        _.fake.account(),
        _.fake.recorder2(),
      ])
      .then(function(results) {
        account = results[0];
        recorder = results[1];
        body = {
          data: [{
            type: 'recorders',
            id: recorder.recorder_id,
          }],
        };
      });
  });

  describe('relationship does not exist', function() {
    it('should succeed.', function(done) {
      handler({
        'api_key': _.fake.API_KEY,
        'Authorization': 'Bearer ' + recorder.at,
        'Content-Type': 'application/vnd.api+json',
        'account_id': account.account_id,
        body: body,
      }, {
        succeed: function(response) {
          expect(response).to.be.undefined;
          done();
        },
        fail: done,
      });
    });

    describe('unformatted body', function() {
      it('should fail with a 400 error.', function(done) {
        var b = _.cloneDeep(body);
        b.data.pop();

        handler({
          api_key: _.fake.API_KEY,
          Authorization: 'Bearer ' + recorder.at,
          'Content-Type': 'application/vnd.api+json',
          account_id: account.account_id,
          body: b,
        }, {
          succeed: function() {
            done(new Error('success with malformed body'));
          },
          fail: function(err) {
            expect(err).to.have.property('message');
            done();
          },
        });
      });
    });

    describe('unauthenticated', function() {
      it('should fail with a 401 error.', function(done) {
        handler({
          api_key: _.fake.API_KEY,
          'Content-Type': 'application/vnd.api+json',
          account_id: account.account_id,
          body: body,
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
          'Content-Type': 'application/vnd.api+json',
          account_id: account.account_id,
          body: body,
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
        'Content-Type': 'application/vnd.api+json',
        account_id: account.account_id,
        body: body,
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
