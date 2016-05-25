//@flow
import {expect} from 'chai'
import fixtures from '../dynamo/test/fixtures'
import domain from '../../domain'
import timestamp from '../../utils/timestamp'
import accounts from '../accounts'
import messages from '../messages'

describe('message entity', function() {
  describe('markRead', function() {
    describe('user has 3 read messages, 3 unread messages from yesterday, 3 unread messages from today', function() {
      describe('mark last message from yesterday', function() {
        it('should mark all messages from yesterday as read.', function() {
          let lastWeek = Date.now() - (1000 * 60 * 60 * 168)
          let yesterday = Date.now() - (1000 * 60 * 60 * 24)
          let account

          return fixtures.account()
            .then(function(_account) {
              account = _account

              delete account.highwater
              return accounts.save(account)
            })
            .then(function() {
              return Promise.all([
                fixtures.message({recipient: account, handled: true, read: true, created: lastWeek}),
                fixtures.message({recipient: account, handled: true, read: true, created: lastWeek}),
                fixtures.message({recipient: account, handled: true, read: true, created: lastWeek}),
                fixtures.message({recipient: account, handled: true, read: false, created: yesterday - 10000}),
                fixtures.message({recipient: account, handled: true, read: false, created: yesterday - 1000}),
                fixtures.message({recipient: account, handled: true, read: false, created: yesterday}),
                fixtures.message({recipient: account, handled: true, read: false, created: Date.now() - 10000}),
                fixtures.message({recipient: account, handled: true, read: false, created: Date.now() - 1000}),
                fixtures.message({recipient: account, handled: true, read: false, created: Date.now()}),
              ])
            })
            .then(function(_messages) {
              return messages.markRead(account, _messages[5])
            })
            .then(function() {
              return messages.unread(account)
            })
            .then(function(unreads) {
              expect(unreads).to.have.length(3)
            })
        })
      })
    })
  })

  describe('domain.newMessage', function() {
    it('should return a Message.', function() {
      return Promise.all([
        fixtures.account(),
        fixtures.account(),
        fixtures.upload(),
      ])
      .then(function(results) {
        let bob = results[0]
        let ann = results[1]
        let upload = results[2]
        let message = domain.newMessage({
          sender: bob,
          recipient: ann,
          upload: upload
        })

        expect(message).to.have.property('created')
        expect(message).to.have.property('message_id')
        expect(message).to.have.property('sender', bob)
        expect(message).to.have.property('recipient', ann)
        expect(message.audioURL()).to.be.ok
        expect(message.resource()).to.be.ok
      })
    })
  })

  describe('domain.makeMessage', function() {
    it('should return a Message.', function() {
      return Promise.all([
        fixtures.account(),
        fixtures.account(),
        fixtures.upload(),
      ])
      .then(function(results) {
        let bob = results[0]
        let ann = results[1]
        let upload = results[2]
        let message = domain.makeMessage({
          sender: bob,
          recipient: ann,
          upload: upload,
          message_id: 'message1',
          created: Date.now(),
          handled: Date.now(),
          handled_by: 'tests',
          read: Date.now(),
          outcome: 'success',
        })

        expect(message).to.have.property('message_id')
        expect(message).to.have.property('sender', bob)
        expect(message).to.have.property('recipient', ann)
        expect(message.created).to.be.ok
        expect(message.handled).to.be.ok
        expect(message.handled_by).to.be.ok
        expect(message.read).to.be.ok
        expect(message.outcome).to.be.ok
        expect(message.audioURL()).to.be.ok
        expect(message.resource()).to.be.ok
      })
    })
  })

  describe('Message.resource', function() {
    it('should return a JSON-API representation.', function() {
      return Promise.all([
        fixtures.account(),
        fixtures.account(),
        fixtures.upload(),
      ])
      .then(function(results) {
        let time = Date.now()
        let bob = results[0]
        let ann = results[1]
        let upload = results[2]
        upload.duration = 4;
        let message = domain.makeMessage({
          sender: bob,
          recipient: ann,
          upload: upload,
          message_id: 'message1',
          created: time,
          handled: time,
          handled_by: 'tests',
          read: time,
          outcome: 'success',
        })
        let resource = message.resource()

        expect(resource).to.have.property('type', 'messages')
        expect(resource).to.have.property('id', 'message1')
        expect(resource).to.have.property('attributes')
        let attrs = resource.attributes
        expect(attrs).to.have.property('created', timestamp(message.created))
        expect(attrs).to.have.property('duration', 4)
        expect(attrs).to.have.property('read', timestamp(message.read))
        expect(attrs).to.have.property('sender_email', message.sender.email)
        expect(attrs).to.have.property('sender_name', message.sender.full_name)
        expect(attrs).to.have.property('recipient_email', message.recipient.email)
      })
    })
  })
})