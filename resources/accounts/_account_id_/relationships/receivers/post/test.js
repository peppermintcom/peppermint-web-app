var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');
var GCM_TOKEN = 'nUYQX9xzZ5o:APA91bEi2YWlmr6sA8WDiBjl1gN_NRVxQOr1AUr6wtij8p9rqtPwUENoVSaCxhYPzfxl7eReXli9ArzZ08MxHGn-hdNPJioRDw03ZpZiz3hMoVwSNiZBSLVLDSZJLr841x2sCmxuFi9e';

describe('AddAccountReceiver', function() {
  var account, recorder, jwt;

  before(function() {
    return Promise.all([
        _.fake.account(),
        _.fake.recorder(),
      ])
      .then(function(results) {
        account = results[0];
        recorder = results[1].recorder;
        jwt = _.jwt.creds(account.account_id, recorder.recorder_id);
      });
  });

  describe('recorder is not registered with GCM', function() {
    describe('account does not have a device group', function() {

    });

    describe('account has a device group', function() {

    });
  });

  describe.only('recorder is registered with GCM', function() {
    describe('account does not have a device group', function() {
      var notificationKey;

      before(function() {
        return _.recorders.update(recorder.recorder_id, {
          gcm_registration_token: {S: GCM_TOKEN},
        });
      });

      after(function() {
        return Promise.all([
          _.gcm.removeDeviceGroupMember(account.email, notificationKey, GCM_TOKEN),
          _.dynamo.del('receivers', {
            recorder_id: {S: recorder.recorder_id},
            account_id: {S: account.account_id}
          }),
        ]);
      });

      it('should create a new device group.', function(done) {
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
                expect(account.gcm_notification_key).to.match(/.+/);
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
