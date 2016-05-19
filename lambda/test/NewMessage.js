//@flow
import type {Account} from '../../domain'
import type {UploadConfig, ReceiverConfig} from '../../repository/fixtures'

import {expect} from 'chai'
import {NewMessage} from '../bundle.js'
import accounts from '../../repository/accounts'
import recorders from '../../repository/recorders'
import fixtures from '../../repository/fixtures'
import Messages from '../../repository/messages'
import Recorders from '../../repository/recorders'

describe('lambda:NewMessage', function() {
  describe('recipient can receive on Android', function() {
    it('should deliver a message via GCM.', function() {
      return fix({
        upload: {postprocessed: true},
        receivers: [{client: 'android', state: 'good'}],
      })
      .then(run)
      .then(function(response) {
        return Messages.read(response.data.id)
          .then(function(message) {
            expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
          })
      })
    })
  })

  describe('recipient can receive on iOS', function() {
    it('should deliver a message via GCM.', function() {
      return fix({
        upload: {postprocessed: true},
        receivers: [{client: 'iOS', state: 'good'}],
      })
      .then(run)
      .then(function(response) {
        return Messages.read(response.data.id)
          .then(function(message) {
            expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
          })
      })
    })
  })

  describe('recipient can receive on 2 androids and 2 iOS devices', function() {
    it('should deliver 4 messages via GCM.', function() {
      return fix({
        upload: {postprocessed: true},
        receivers: [
          {client: 'iOS', state: 'good'},
          {client: 'iOS', state: 'good'},
          {client: 'android', state: 'good'},
          {client: 'android', state: 'good'},
        ],
      })
      .then(run)
      .then(function(response) {
        return Messages.read(response.data.id)
          .then(function(message) {
            expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
            expect(message.outcome).to.match(/4$/)
          })
      })
    })
  })

  describe('recipient has an old iOS receiver.', function() {
    it('should deliver 1 message via GCM.', function() {
      let recorder

      return fix({
        upload: {postprocessed: true},
        receivers: [
          {client: 'iOS', state: 'old'}
        ],
      })
      .then(function(fixed) {
        recorder = fixed.receivers[0].recorder
        return fixed
      })
      .then(run)
      .then(function(response) {
        return Messages.read(response.data.id)
          .then(function(message) {
            expect(message.handled).to.be.within(Date.now() - 1000, Date.now())

            return Recorders.read(recorder.client_id)
          })
          .then(function(_recorder) {
            expect(_recorder.gcm_registration_token).to.be.ok
            expect(_recorder.gcm_registration_token).not.to.equal(recorder.gcm_registration_token)
          })
      })
    })
  })

  describe('recipient has a bad android receiver.', function() {
    it('should fail to deliver the message.', function() {
      let recorder

      return fix({
        upload: {postprocessed: true},
        receivers: [
          {client: 'android', state: 'bad'},
        ],
      })
      .then(function(fixed) {
        recorder = fixed.receivers[0].recorder
        return fixed
      })
      .then(run)
      .catch(function(err) {
        expect(err.message).to.equal('404')
      })
      .then(function() {
        return Recorders.read(recorder.client_id)
      })
      .then(function(recorder) {
        expect(recorder.gcm_registration_token).to.equal(null)
      })
    })
  })

  describe('recipient has a mix of receivers', function() {
    it('should deliver the message and update tokens.', function() {
      let fixed

      return fix({
        upload: {postprocessed: true},
        receivers: [
          {client: 'android', state: 'good'},
          {client: 'android', state: 'old'},
          {client: 'android', state: 'bad'},
          {client: 'iOS', state: 'good'},
          {client: 'iOS', state: 'old'},
          {client: 'iOS', state: 'bad'},
        ],
      })
      .then(function(_fixed) {
        fixed = _fixed
        return fixed
      })
      .then(run)
      .then(function(response) {
        return Messages.read(response.data.id)
          .then(function(message) {
            expect(message.handled).to.be.within(Date.now() - 1000, Date.now())
            expect(message.handled_by).to.be.ok
            expect(message.outcome).to.match(/4$/)
          })
      })
    })
  })

  describe('upload is not ready', function() {
    it('should save the message for future delivery.', function() {
      let fixed

      return fix({
        upload: {postprocessed: false},
        receivers: [
          {client: 'android', state: 'good'},
          {client: 'android', state: 'old'},
          {client: 'android', state: 'bad'},
          {client: 'iOS', state: 'good'},
          {client: 'iOS', state: 'old'},
          {client: 'iOS', state: 'bad'},
        ],
      })
      .then(function(_fixed) {
        fixed = _fixed
        return fixed
      })
      .then(run)
      .then(function(response) {
        return Messages.read(response.data.id)
      })
      .then(function(message) {
        expect(message.handled).to.equal(null)
      })
    })
  })
})

type Config = {
  receivers: ReceiverConfig[];
  upload: UploadConfig;
}
function fix(config: Config) {
  return Promise.all([
    fixtures.upload(config.upload),
    fixtures.account(),
    fixtures.account(),
  ])
  .then(function(results) {
    let upload = results[0]
    let bob = results[1]
    let ann = results[2]

    return Promise.all(config.receivers.map(function(r) {
      r.account = ann
      return fixtures.receiver(r)
    }))
    .then(function(receivers) {
      return {
        upload: upload,
        bob: bob,
        ann: ann,
        receivers: receivers,
      }
    })
  })
}

function run(fixed) {
  return new Promise(function(resolve, reject) {
    NewMessage({
      api_key: fixtures.API_KEY,
      'Content-Type': 'application/vnd.api+json',
      Authorization: 'Bearer ' + fixtures.jwt(fixed.bob.account_id),
      body: {
        data: {
          type: 'messages',
          attributes: {
            sender_email: fixed.bob.email,
            recipient_email: fixed.ann.email,
            audio_url: 'http://go.peppermint.com/' + fixed.upload.pathname(),
          },
        },
      },
    }, null, function(err, response) {
      if (err) {
        reject(err)
        return
      }
      resolve(response)
    })
  })
}
