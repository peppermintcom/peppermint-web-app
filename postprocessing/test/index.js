var expect = require('chai').expect;
var handler = require('../').handler;
var _ = require('utils/test');

const KEY = _.fake.UPLOAD_KEY;
const AUDIO_URL = 'http://go.peppermint.com/' + KEY;
const SIZE = 22032;
const TIMEOUT = 30000;

describe('lambda:Postprocess', function() {
  this.timeout(TIMEOUT);
  var sender1, sender2;
  //sam does not have an account
  var sam;
  var messageToSam;
  //jen has an account but no receivers
  var jen;
  var messageToJen;
  //ray has a receiver but no gcm_registration_token
  var ray;
  var messageToRay;
  //don has an iOS receiver with a valid gcm_registration_token
  var don;
  var messageToDon;
  var donGCMToken;
  //sue has an android receiver with an expired but usable
  //gcm_registration_token
  var sue;
  var messageToSue;
  var sueGCMToken;
  //bob has an invalid gcm_registration_token
  var bob;
  var messageToBob;

  //clear state
  before(function() {
    while (_.gcm.sends.pop()) {}
    return _.messages.delByAudioURL(_.fake.AUDIO_URL);
  });

  //two senders wtih accounts
  before(function() {
    return Promise.all([
        _.fake.account(),
        _.fake.account(),
      ])
      .then(function(results) {
        sender1 = results[0];
        sender2 = results[1];
      });
  });

  //pending message to an email that does not have an account
  before(function() {
    sam = _.fake.user();
    messageToSam = _.messages.create({
      sender_email: sender1.email,
      recipient_email: sam.email,
      audio_url: AUDIO_URL,
    });

    return _.messages.put(messageToSam);
  });

  //pending message to an email that has an account but no receivers
  before(function() {
    return _.fake.account().then(function(account) {
      jen = account;
      messageToJen = _.messages.create({
        sender_email: sender2.email,
        recipient_email: jen.email,
        audio_url: AUDIO_URL,
      });

      return _.messages.put(messageToJen);
    });
  });

  //pending message to an accout that has a receiver but no
  //gcm_registration_token
  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.recorder2(),
    ])
    .then(function(results) {
      ray = results[0];
      messageToRay = _.messages.create({
        sender_email: sender1.email,
        recipient_email: ray.email,
        audio_url: AUDIO_URL,
      });

      return Promise.all([
        _.messages.put(messageToRay),
        _.receivers.link(results[1].recorder_id, ray.account_id),
      ]);
    });
  });

  //pending message to an account that has an iOS receiver
  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.recorder2(),
    ])
    .then(function(results) {
      var donRecorder = results[1];
      don = results[0];
      donGCMToken = _.token(64);
      messageToDon = _.messages.create({
        sender_email: sender2.email,
        recipient_email: don.email,
        audio_url: AUDIO_URL,
      });

      _.gcm.good(donGCMToken);

      return Promise.all([
        _.messages.put(messageToDon),
        _.receivers.link(donRecorder.recorder_id, don.account_id),
        _.recorders.update(donRecorder.recorder_client_id, 'SET gcm_registration_token = :gcm_registration_token, api_key = :api_key', {
          ':gcm_registration_token': {S: donGCMToken},
          ':api_key': {S: _.fake.API_KEY_IOS},
        }),
      ]);
    });
  });

  //pending message to an accout with an expired Android receiver
  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.recorder2(),
    ])
    .then(function(results) {
      var sueRecorder = results[1];
      sue = results[0];
      sueGCMToken = _.token(64);
      messageToSue = _.messages.create({
        sender_email: sender1.email,
        recipient_email: sue.email,
        audio_url: AUDIO_URL,
      });

      _.gcm.old(sueGCMToken);

      return Promise.all([
        _.messages.put(messageToSue),
        _.receivers.link(sueRecorder.recorder_id, sue.account_id),
        _.recorders.update(sueRecorder.recorder_client_id, 'SET gcm_registration_token = :gcm_registration_token, api_key = :api_key', {
          ':gcm_registration_token': {S: sueGCMToken},
          ':api_key': {S: _.fake.API_KEY_ANDROID},
        }),
      ]);
    });
  });

  //pending message to an account with an invalid receiver
  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.recorder2(),
    ])
    .then(function(results) {
      var bobRecorder = results[1];
      var bobGCMToken = _.token(64);
      bob = results[0];
      messageToBob = _.messages.create({
        sender_email: sender2.email,
        recipient_email: bob.email,
        audio_url: AUDIO_URL,
      });

      _.gcm.bad(bobGCMToken);

      return Promise.all([
        _.messages.put(messageToBob),
        _.receivers.link(bobRecorder.recorder_id, bob.account_id),
        _.recorders.update(bobRecorder.recorder_client_id, 'SET gcm_registration_token = :gcm_registration_token', {
          ':gcm_registration_token': {S: bobGCMToken},
        }),
      ]);
    });
  });

  describe('put event for mp3 that is 5.5 seconds long', function() {
    var upload;

    before(function() {
      return _.uploads.update(KEY, 'REMOVE seconds, uploaded');
    });

    it('should succeed.', function(done) {
      handler(e(KEY, SIZE), {
        fail: done,
        succeed: function() {
          _.uploads.get(KEY)
            .then(function(_upload) {
              upload = _upload;
              done();
            });
        },
      });
    });

    it('should set the duration to 3 in the database.', function() {
      expect(upload).to.have.property('seconds', 3);
    });

    it('should stamp the processed time in the database.', function() {
      expect(upload.postprocessed).to.be.within(Date.now() - TIMEOUT, Date.now());
    });

    it('should stamp the uploaded time in the database.', function() {
      expect(upload.uploaded).to.be.below(upload.postprocessed);
    });

    it("it should mark Sam's message handled without delivery for lack of a recipient account", function() {
      return _.messages.get(messageToSam.message_id).then(function(message) {
        expect(message.handled).to.be.within(Date.now() - 2*TIMEOUT, Date.now());
        expect(message).to.have.property('handled_by', _.messages.handlers.POSTPROCESSING);
        expect(message).to.have.property('outcome', _.messages.drop_reason.NO_RECIPIENT);
      });
    });

    it("should mark Jen's message handled without delivery for lack of a receiver", function() {
      return _.messages.get(messageToJen.message_id).then(function(message) {
        expect(message.handled).to.be.within(Date.now() - 2*TIMEOUT, Date.now());
        expect(message).to.have.property('handled_by', _.messages.handlers.POSTPROCESSING);
        expect(message).to.have.property('outcome', _.messages.drop_reason.NO_RECEIVER);
      });
    });

    it("should mark Ray's message handled without delivery for lack of gcm registration token", function() {
      return _.messages.get(messageToRay.message_id).then(function(message) {
        expect(message.handled).to.be.within(Date.now() - 2*TIMEOUT, Date.now());
        expect(message).to.have.property('handled_by', _.messages.handlers.POSTPROCESSING);
        expect(message).to.have.property('outcome', _.messages.drop_reason.NO_GCM_REGISTRATION_TOKEN);
      });
    });

    it("should mark Don's message delivered.", function() {
      return _.messages.get(messageToDon.message_id).then(function(message) {
        expect(message.handled).to.be.within(Date.now() - 2*TIMEOUT, Date.now());
        expect(message).to.have.property('handled_by', _.messages.handlers.POSTPROCESSING);
        expect(message).to.have.property('outcome', 'GCM success count: 1');
      });
    });

    it("should mark Sue's message delivered.", function() {
      return _.messages.get(messageToSue.message_id).then(function(message) {
        expect(message.handled).to.be.within(Date.now() - 2*TIMEOUT, Date.now());
        expect(message).to.have.property('handled_by', _.messages.handlers.POSTPROCESSING);
        expect(message).to.have.property('outcome', 'GCM success count: 1');
      });
    });

    it("should mark Bob's message handled with delivery failure.", function() {
      return _.messages.get(messageToBob.message_id).then(function(message) {
        expect(message.handled).to.be.within(Date.now() - 2*TIMEOUT, Date.now());
        expect(message).to.have.property('handled_by', _.messages.handlers.POSTPROCESSING);
        expect(message).to.have.property('outcome', 'GCM success count: 0');
      });
    });

    it('should have sent a total of 3 messages to GCM.', function() {
      //Sam: 0
      //Jen: 0
      //Ray: 0
      //Don: 1
      //Sue: 1
      //Bob: 1
      expect(_.gcm.sends).to.have.length(3);
    });
  });
});

//mock event for put in peppermint-cdn bucket
function e(key, size) {
  return {
    Records: [{
      eventVersion: '2.0',
      eventSource: 'aws:s3',
      awsRegion: 'us-west-2',
      eventTime: '1970-01-01T00:00:00.000Z',
      eventName: 'ObjectCreated:Put',
      userIdentity: {
        principalID: 'AIDAJDPLRKLG7UEXAMPLE',
      },
      requestParameters: {
        sourceIPAddress: "127.0.0.1",
      },
      responseElements: {
        'x-amz-request-id': 'C3D13FE58DE4C810',
        'x-amz-id-2': 'FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD',
      },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'testConfigRule',
        bucket: {
          name: 'peppermint-cdn',
          ownerIdentity: {
            principalId: 'A3NL1KOZZKExample',
          },
          arn: 'arn:aws:s3:::peppermint-cdn',
        },
        object: {
          key: key,
          size: size,
          eTag: 'd41d8cd98f00b204e9800998ecf8427e',
          versionId: '096fKKXTRTtl3on89fVO.nfljtsv6qko',
          sequencer: '0055AED6DCD90281E5',
        },
      },
    }],
  };
}
