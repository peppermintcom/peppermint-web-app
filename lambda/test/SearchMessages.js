import url from 'url'
import {expect} from 'chai'
import tv4 from 'tv4'
import * as spec from '../../resources/messages/get/spec'
import fixtures from '../../procedures/test/fixtures'
import {SearchMessages} from '../bundle'
import timestamp from '../../utils/timestamp'
import parseTime from '../../utils/parseTime'

var WEEK = 1000 * 60 * 60 * 24 * 7;
const begin = '2016-01-01 00:00:00';

describe.only('lambda:SearchMessages', function() {
  describe('no messages have been sent', function() {
    let bob = null;

    before(function() {
      return fixtures.account()
      .then(function(account) {
        bob = account[0];
      })
    })

    describe('query by sender', function() {
      it('should return an empty collection.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: 'Bearer ' + fixtures.jwt(bob.account_id),
          since: begin,
          sender_id: bob.account_id,
        }, null, function(err, res) {
          if (err) return done(err)
          expect(res).to.deep.equal({data: []})
          if (!tv4.validate(res, spec.responses['200'].schema)) {
            return done(tv4.error)
          }
          done()
        })
      })
    })

   describe('query by recipient', function() {
      it('should return an empty collection.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: 'Bearer ' + fixtures.jwt(bob.account_id),
          since: begin,
          recipient_id: bob.account_id,
        }, null, function(err, res) {
          if (err) return done(err)
          expect(res).to.deep.equal({data: []})
          if (!tv4.validate(res, spec.responses['200'].schema)) {
            return done(tv4.error)
          }
          done()
        })
      })
    })

    describe('neither recipient_id nor sender_id defined', function() {
      it('should return a client error.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: 'Bearer ' + fixtures.jwt(bob.account_id),
          since: begin,
          recipient_id: bob.account_id,
          sender_id: bob.account_id,
        }, null, function(err, res) {
          expect(err).to.be.ok;
          done()
        })
      })
    })
  })

  describe('bob has sent ann 100 messages over the past month', function() {
    let now = Date.now()
    let monthAgo = now - (1000 * 60 * 60 * 24 * 30)
    let bob = null
    let ann = null

    before(function() {
      return Promise.all([
        fixtures.account(),
        fixtures.account(),
      ])
      .then(function(accounts) {
        bob = accounts[0][0]
        ann = accounts[1][0]

        bob.Authorization = 'Bearer ' + fixtures.jwt(bob.account_id)
        ann.Authorization = 'Bearer ' + fixtures.jwt(ann.account_id)
      })
    })

    before(function() {
      return fixtures.messages({
        handled_count: 100,
        read_count: 50,
        sender: bob,
        recipient: ann,
      })
    })

    describe('query bob qua sender over past month', function() {
      it('should return 100 messages.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: bob.Authorization,
          sender_id: bob.account_id,
        }, null, function(err, res) {
          if (err) return done(err)
          expect(res.data).to.have.length(100)
          expect(res).not.to.have.property('links')
          if (!tv4.validate(res, spec.responses['200'].schema)) {
            return done(tv4.error)
          }
          //check chronological order
          expect(parseTime(res.data[0].attributes.created)).to.be.below(
                parseTime(res.data[99].attributes.created))
          done()
        })
      })

      describe('in reverse order', function(done) {
        it('should return the same messages from oldest to newest.', function(done) {
          SearchMessages({
            api_key: fixtures.API_KEY,
            Authorization: bob.Authorization,
            sender_id: bob.account_id,
            order: 'reverse',
          }, null, function(err, res) {
            //check reverse order
            expect(parseTime(res.data[0].attributes.created)).to.be.above(
                  parseTime(res.data[99].attributes.created))
            done()
          })
        })
      })

      describe('with limit of 75', function() {
        it('should return 75 messages and a "next" link.', function(done) {
          SearchMessages({
            api_key: fixtures.API_KEY,
            Authorization: bob.Authorization,
            sender_id: bob.account_id,
            limit: '75',
            order: 'reverse',
          }, null, function(err, res) {
            if (err) return done(err)
            if (!tv4.validate(res, spec.responses['200'].schema)) {
              return done(tv4.error)
            }
            expect(res.data).to.have.length(75)
            expect(res).to.have.property('links')
            expect(res.links).to.have.property('next')

            let parts = url.parse(res.links.next, true)
            expect(parts.query.sender).to.equal(bob.account_id)
            expect(parts.query).to.have.property('limit', '75')
            expect(parts.query).to.have.property('order', 'reverse')

            SearchMessages({
              api_key: fixtures.API_KEY,
              Authorization: bob.Authorization,
              sender_id: parts.query.sender,
              limit: 100,
              position: parts.query.position,
              order: parts.query.order,
            }, null, function(err, res) {
              if (err) return done(err)
              expect(res.data).to.have.length(25)
              if (!tv4.validate(res, spec.responses['200'].schema)) {
                return done(tv4.error)
              }
              expect(res).not.to.have.property('links')
              done()
            })
          })
        })
      })
    })

    describe('since last week', function() {
      it('should return around 25 message.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: bob.Authorization,
          sender_id: bob.account_id,
          since: timestamp(Date.now() - (1000 * 60 * 60 * 24 * 7)),
        }, null, function(err, res) {
          if (err) return done(err)
          expect(res.data.length).to.be.below(50)
          expect(res.data.length).to.be.above(5)
          done()
        })
      })
    })

    describe('query ann qua recipient', function() {
      describe('until a week ago.', function() {
        it('should return around 75 messages.', function(done) {
          SearchMessages({
            api_key: fixtures.API_KEY,
            Authorization: ann.Authorization,
            recipient_id: ann.account_id,
            until: timestamp(Date.now() - (1000 * 60 * 60 * 24 * 7)),
          }, null, function(err, res) {
            if (err) return done(err)
            expect(res.data.length).to.be.within(50, 95)
            done()
          })
        })
      })
    })

    describe('query bob qua recipient', function() {
      it('should return an empty set.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: bob.Authorization,
          recipient_id: bob.account_id,
        }, null, function(err, res) {
          if (err) return done(err)
          expect(res).to.deep.equal({data: []})
          done();
        })
      })
    })

    describe('query ann qua sender', function() {
      it('should return an empty set.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: ann.Authorization,
          sender_id: ann.account_id,
        }, null, function(err, res) {
          if (err) return done(err)
          expect(res).to.deep.equal({data: []})
          done()
        })
      })
    })

    describe('incorrect Auth header', function() {
      it('should return a Forbidden error.', function(done) {
        SearchMessages({
          api_key: fixtures.API_KEY,
          Authorization: ann.Authorization,
          recipient_id: bob.account_id,
        }, null, function(err, res) {
          expect(err).to.be.ok
          done()
        })
      })
    })
  })
})
