var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:AddAccountReceiver', function() {
  describe('Authorization header authenticates a recorder and account', function() {
    var account, recorder, jwt;
    var accountID, recorderID;

    before(function() {
      return Promise.all([
          _.fake.account(),
          _.fake.recorder(),
        ])
        .then(function(results) {
          account = results[0];
          recorder = results[1].recorder;
          recorderID = recorder.recorder_id;
          accountID = account.account_id;
          jwt = _.jwt.creds(accountID, recorderID);
        });
    });

    it('should link the recorder and the account.', function(done) {
      handler({
        Authorization: 'Bearer ' + _.jwt.creds(accountID, recorderID),
        'Content-Type': 'application/vnd.api+json',
        api_key: _.fake.API_KEY,
        account_id: accountID,
        body: {data: [{type: 'recorders', id: recorderID}]},
      }, {
        fail: done,
        succeed: function(result) {
          _.receivers.get(recorderID, accountID)
            .then(function(record) {
              expect(record).to.be.ok;
              done();
            })
            .catch(done);
        },
      });
    });
  });
});
