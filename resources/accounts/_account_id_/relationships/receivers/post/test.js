var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:AddAccountReceiver', function() {
  var account, recorder, receiver, jwt, adg;

  before(function() {
    return Promise.all([
        _.fake.account(),
        _.fake.recorder(),
        _.fake.receiver(),
        _.fake.accountDeviceGroup(),
      ])
      .then(function(results) {
        account = results[0];
        recorder = results[1].recorder;
        receiver = results[2];
        adg = results[3];
        jwt = _.jwt.creds(account.account_id, recorder.recorder_id);
        receiverJWT = _.jwt.creds(account.account_id, receiver.recorder_id);
      });
  });

  describe('account has a device group', function() {
    var accountID;

    before(function() {
      accountID = adg.account.account_id;
    });

    describe('recorder is registered with GCM', function() {
      var recorderID;

      before(function() {
        recorderID = receiver.recorder_id;
      });

      after(function() {
        return _.dynamo.del('receivers', {
          account_id: {S: accountID},
          recorder_id: {S: recorderID},
        });
      });

      before(function(done) {
        handler({
          Authorization: 'Bearer ' + _.jwt.creds(accountID, recorderID),
          'Content-Type': 'application/vnd.api+json',
          api_key: _.fake.API_KEY,
          account_id: accountID,
          body: {data: [{type: 'recorders', id: recorderID}]},
        }, {
          fail: done,
          succeed: function() {
            done();
          },
        });
      });

      it('should link the recorder and account.', function() {
        return _.receivers.get(recorderID, accountID)
          .then(function(record) {
            expect(record).to.be.ok;
          });
      });

      it('should add the recorder to the account\'s existing device group', function() {
        var group = _.gcm.store[adg.account.gcm_notification_key];

        expect(group[1]).to.equal(receiver.gcm_registration_token);
      });
    });

    describe('recorder is not registered with GCM', function() {
      var recorderID;

      before(function() {
        recorderID = receiver.recorder_id;
      });

      after(function() {
        return _.dynamo.del('receivers', {
          recorder_id: {S: recorderID},
          account_id: {S: accountID},
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
          succeed: function() {
            _.receivers.get(recorderID, accountID)
              .then(function(record) {
                expect(record).to.be.ok;
                done();
              });
          },
        });
      });
    });
  });

  describe('account does not have a device group', function() {
    describe('recorder is not registered with GCM', function() {
      after(function() {
        return _.dynamo.del('receivers', {
          recorder_id: {S: recorder.recorder_id},
          account_id: {S: account.account_id}
        });
      });

      it('should link the account to the recorder', function(done) {
        handler({
          Authorization: 'Bearer ' + jwt,
          api_key: _.fake.API_KEY,
          'Content-Type': 'application/vnd.api+json',
          body: {
            data: [{type: 'recorders', id: recorder.recorder_id}],
          },
          account_id: account.account_id,
        }, {
          fail: function(err) {
            done(err);
          },
          succeed: function(result) {
            //check the receivers item and the gcm_notification_key on the
            //account
            Promise.all([
                _.accounts.get(account.email),
                _.dynamo.get('receivers', {
                  recorder_id: {S: recorder.recorder_id},
                  account_id: {S: account.account_id},
                }),
              ])
              .then(function(results) {
                var account = results[0];
                var receiverItem = results[1];

                expect(receiverItem).to.be.ok;
                expect(account.gcm_notification_key).to.equal(undefined);
                done();
              })
              .catch(done);
          },
        });
      });
    });

    describe('recorder is registered with GCM', function() {
      var notificationKey;

      after(function() {
        return Promise.all([
          _.gcm.removeDeviceGroupMember(account.email, notificationKey, receiver.gcm_registration_token),
          _.dynamo.del('receivers', {
            recorder_id: {S: receiver.recorder_id},
            account_id: {S: account.account_id}
          }),
        ]);
      });

      it('should create a new device group.', function(done) {
        handler({
          Authorization: 'Bearer ' + receiverJWT,
          api_key: _.fake.API_KEY,
          'Content-Type': 'application/vnd.api+json',
          body: {
            data: [{type: 'recorders', id: receiver.recorder_id}],
          },
          account_id: account.account_id,
        }, {
          fail: function(err) {
            done(err);
          },
          succeed: function(result) {
            //check the receivers item and the gcm_notification_key on the
            //account
            Promise.all([
                _.accounts.get(account.email),
                _.dynamo.get('receivers', {
                  recorder_id: {S: receiver.recorder_id},
                  account_id: {S: account.account_id},
                }),
              ])
              .then(function(results) {
                var account = results[0];
                var receiverItem = results[1];

                expect(receiverItem).to.be.ok;
                expect(account.gcm_notification_key).to.be.ok;
                notificationKey = account.gcm_notification_key;
                done();
              })
              .catch(done);
          },
        });
      });
    });
  });
});
