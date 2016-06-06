import {expect} from 'chai'
import {Postprocess} from '../bundle'
import domainUtils from '../../domain/utils'
import fixtures from '../../repository/fixtures'
import Uploads from '../../repository/uploads'
import Messages from '../../repository/messages'
import Recorders from '../../repository/recorders'
import transcriptions from '../../repository/dynamo/transcriptions'

const KEY = fixtures.UPLOAD_KEY;
const AUDIO_URL = 'http://go.peppermint.com/' + KEY;
const SIZE = 10368;
const TIMEOUT = 30000;

describe('lambda:Postprocess', function() {
  describe('no pending ids', function() {
    it('should save the postprocessed results to the upload.', function() {
      return fix({
        upload: {},
        receivers: [{client: 'android', state: 'good'}],
        pendingMessage: false,
      })
      .then(run)
      .then(function(res) {
        return Uploads.read(KEY)
      })
      .then(function(upload) {
        expect(upload.duration).to.equal(3)
        expect(upload.postprocessed).to.be.within(Date.now() - TIMEOUT, Date.now())
        expect(upload.uploaded).to.be.within(Date.now() - TIMEOUT, upload.postprocessed)
      })
    })
  })

  describe('pending message id', function() {
    describe('recipient has android receiver', function() {
      it('should deliver the message.', function() {
        let delivery

        return fix({
          upload: {transcription: true},
          receivers: [{client: 'android', state: 'good'}],
          pendingMessages: true,
        })
        .then(run)
        .then(function(res) {
          delivery = res.deliveries[0]

          return Promise.all([
            Uploads.read(KEY),
            Messages.read(res.messages[0].message_id)
          ])
        })
        .then(function(results) {
          let upload = results[0]
          let message = results[1]

          expect(upload.duration).to.equal(3)
          expect(upload.postprocessed).to.be.within(Date.now() - TIMEOUT, Date.now())
          expect(upload.uploaded).to.be.within(Date.now() - TIMEOUT, upload.postprocessed)

          expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
          expect(message.handled_by).to.equal('lambda:Postprocess')
          expect(message.outcome).to.equal('GCM success count: 1')

          expect(delivery.android.message.data.transcription).to.equal('fake test transcription')
        })
      })
    })

    describe('recipient has ios receiver and upload has transcription', function() {
      let delivery

      it('should deliver the message.', function() {
        return fix({
          upload: {transcription: true},
          receivers: [{client: 'ios', state: 'good'}],
          pendingMessages: true,
        })
        .then(run)
        .then(function(res) {
          delivery = res.deliveries[0]

          return Promise.all([
            Uploads.read(KEY),
            Messages.read(res.messages[0].message_id)
          ])
        })
        .then(function(results) {
          let upload = results[0]
          let message = results[1]

          expect(upload.duration).to.equal(3)
          expect(upload.postprocessed).to.be.within(Date.now() - TIMEOUT, Date.now())
          expect(upload.uploaded).to.be.within(Date.now() - TIMEOUT, upload.postprocessed)

          expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
          expect(message.handled_by).to.equal('lambda:Postprocess')
          expect(message.outcome).to.equal('GCM success count: 1')

          expect(delivery.iOS.message.notification.title).to.equal('Peppermint Audio Message')
          expect(delivery.iOS.message.notification.body).to.equal('fake test transcription')
        })
      })
    })

    describe('recipient has old android receiver.', function() {
      it('should deliver the message and update the GCM token.', function() {
        let recorder

        return fix({
          upload: {},
          receivers: [{client: 'android', state: 'old'}],
          pendingMessages: true,
        })
        .then(function(fixed) {
          recorder = fixed.receivers[0].recorder

          return fixed
        })
        .then(run)
        .then(function(res) {
          return Promise.all([
            Uploads.read(KEY),
            Messages.read(res.messages[0].message_id),
            Recorders.read(recorder.client_id)
          ])
        })
        .then(function(results) {
          let upload = results[0]
          let message = results[1]
          let _recorder = results[2]

          expect(upload.duration).to.equal(3)
          expect(upload.postprocessed).to.be.within(Date.now() - TIMEOUT, Date.now())
          expect(upload.uploaded).to.be.within(Date.now() - TIMEOUT, upload.postprocessed)

          expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
          expect(message.handled_by).to.equal('lambda:Postprocess')
          expect(message.outcome).to.equal('GCM success count: 1')

          expect(_recorder.gcm_registration_token).to.be.ok
          expect(_recorder.gcm_registration_token).not.to.equal(recorder.gcm_registration_token)
        })
      })
    })

    describe('recipient has bad ios receiver.', function() {
      it('should mark the upload postprocessed, deliver 0 messages, and strip the gcm token', function() {
        let recorder

        return fix({
          upload: {},
          receivers: [{client: 'ios', state: 'bad'}],
          pendingMessages: true,
        })
        .then(function(fixed) {
          recorder = fixed.receivers[0].recorder

          return fixed
        })
        .then(run)
        .then(function(res) {
          return Promise.all([
            Uploads.read(KEY),
            Messages.read(res.messages[0].message_id),
            Recorders.read(recorder.client_id)
          ])
        })
        .then(function(results) {
          let upload = results[0]
          let message = results[1]
          let _recorder = results[2]

          expect(upload.duration).to.equal(3)
          expect(upload.postprocessed).to.be.within(Date.now() - TIMEOUT, Date.now())
          expect(upload.uploaded).to.be.within(Date.now() - TIMEOUT, upload.postprocessed)

          expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
          expect(message.handled_by).to.equal('lambda:Postprocess')
          expect(message.outcome).to.equal('GCM success count: 0')

          expect(_recorder.gcm_registration_token).to.equal(null)
        })
      })
    })

    describe('recipient has a mix of receivers', function() {
      it('should deliver the message and update tokens.', function() {
        let fixed

        return fix({
          upload: {},
          receivers: [
            {client: 'android', state: 'good'},
            {client: 'android', state: 'old'},
            {client: 'android', state: 'bad'},
            {client: 'iOS', state: 'good'},
            {client: 'iOS', state: 'old'},
            {client: 'iOS', state: 'bad'},
          ],
          pendingMessages: true,
        })
        .then(function(_fixed) {
          fixed = _fixed
            console.log(fixed)
          return fixed
        })
        .then(run)
        .then(function(res) {
          return Promise.all([
            Uploads.read(KEY),
            Messages.read(res.messages[0].message_id),
          ])
        })
        .then(function(result) {
          let upload = result[0]
          let message = result[1]

          expect(upload.duration).to.equal(3)
          expect(upload.postprocessed).to.be.within(Date.now() - TIMEOUT, Date.now())
          expect(upload.uploaded).to.be.within(Date.now() - TIMEOUT, upload.postprocessed)

          expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
          expect(message.handled_by).to.be.ok
          expect(message.outcome).to.match(/4$/)

          return Promise.all(fixed.receivers.map(function(receiver) {
            return Recorders.read(receiver.recorder.client_id)
          }))
        })
        .then(function(recorders) {
          //good android token is unchanged
          expect(recorders[0].gcm_registration_token).to.equal(fixed.receivers[0].recorder.gcm_registration_token)
          //old android token is updated
          expect(recorders[1].gcm_registration_token).to.be.ok
          expect(recorders[1].gcm_registration_token).not.to.equal(fixed.receivers[1].recorder.gcm_registration_token)
          //bad android token is stripped
          expect(recorders[2].gcm_registration_token).to.equal(null)
          
          //good ios token is unchanged
          expect(recorders[3].gcm_registration_token).to.equal(fixed.receivers[3].recorder.gcm_registration_token)
          //old ios token is updated
          expect(recorders[4].gcm_registration_token).to.be.ok
          expect(recorders[4].gcm_registration_token).not.to.equal(fixed.receivers[4].recorder.gcm_registration_token)
          //bad ios token is stripped
          expect(recorders[5].gcm_registration_token).to.equal(null)
        })
      })
    })
  })
})

type Config = {
  receivers: ReceiverConfig[];
  upload: UploadConfig;
  pendingMessages: boolean;
}
function fix(config: Config) {
  let upload
  let bob
  let ann
  let receivers
  let message

  return Promise.all([
    fixtures.upload(config.upload),
    fixtures.account(),
    fixtures.account(),
  ])
  .then(function(results) {
    upload = results[0]
    bob = results[1]
    ann = results[2]

    //we need to set the pathname to an existing upload for the
    //postprocessing function to work, so change the pathname on the fixture
    //upload to the existing UPLOAD_KEY
    return Uploads.read(upload.pathname())
  })
  .then(function(upload) {
    let parts = domainUtils.decodePathname(KEY)

    upload.upload_id = parts.id
    upload.recorder.recorder_id = parts.recorder_id
    upload.content_type = parts.content_type

    if (upload.transcription) {
      upload.transcription.upload = upload
    }

    return Promise.all([
      Uploads.save(upload),
      upload.transcription ? transcriptions.save(upload.transcription) : Promise.resolve()
    ])
  })
  .then(function(results) {
    upload = results[0]
    let tx = results[1]

    upload.transcription = tx

    //fix the receivers
    return Promise.all(config.receivers.map(function(r) {
      r.account = ann
      return fixtures.receiver(r)
    }))
    .then(function(_receivers) {
      receivers = _receivers

      if (!config.pendingMessages) {
        return {
          upload: upload,
          bob: bob,
          ann: ann,
          receivers: receivers,
        }
      }

      return fixtures.message({
        upload: upload,
        sender: bob,
        recipient: ann,
        handled: false,
        read: false,
      })
      .then(function(message) {
        return Uploads.addPendingMessageID(upload.pathname(), message.message_id)
          .then(function() {
            return {
              upload: upload,
              bob: bob,
              ann: ann,
              receivers: receivers,
              message: message,
            }
          })
      })
    })
  })
}

function run(fixed) {
  return new Promise(function(resolve, reject) {
    Postprocess({
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
            key: KEY,
            size: SIZE,
            eTag: 'd41d8cd98f00b204e9800998ecf8427e',
            versionId: '096fKKXTRTtl3on89fVO.nfljtsv6qko',
            sequencer: '0055AED6DCD90281E5',
          },
        },
      }],
    }, null, function(err, response) {
      if (err) {
        reject(err)
        return
      }
      resolve(response)
    })
  })
}
