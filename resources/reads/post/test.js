var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe('lambda:ReadMessage', function() {
  var recipient, sender, recorder, message;
  var params;

  before(function() {
    return Promise.all([
       _.fake.account(),
       _.fake.account(),
       _.fake.recorder2(),
    ])
    .then(function(results) {
      recipient = results[0];
      sender = results[1];
      recorder = results[2];
    });
  });

  before(function() {
    return  _.fake.messages({sender: sender, recipient: recipient, unread: 1})
      .then(function(results) {
        message = results[0];
      });
  });

  before(function() {
    params = function() {
      return {
        api_key: _.fake.API_KEY,
        Authorization: 'Bearer ' + recipient.at,
        'Content-Type': 'application/vnd.api+json',
        body: {
          data: {
            type: 'reads',
            id: message.message_id,
          },
        },
      };
    };
  });

  it('should mark a message with a read timestamp.', function(done) {
    handler(params(), {
      succeed: function(res) {
        expect(res).to.be.undefined;
        _.messages.get(message.message_id).then(function(msg) {
          expect(msg).to.have.property('read');
          expect(msg.read).to.be.within(Date.now() - 10000, Date.now());
          done();
        })
        .catch(done);
      },
      fail: done,
    });
  });

  describe('message already read', function() {
    var when = Date.now() - 10000;

    before(function() {
      return _.messages.update(message.message_id, 'SET #read = :now', {
        ':now': {N: when.toString()},
      }, {
        '#read': 'read',
      });
    });

    it('should succeed but leave the existing timestamp.', function(done) {
      handler(params(), {
        succeed: function(res) {
          expect(res).to.be.undefined;
          _.messages.get(message.message_id).then(function(message) {
            expect(message).to.have.property('read', when);
            done();
          });
        },
        fail: done,
      });
    });
  });

  describe('message does not exist.', function() {
    it('should fail.', function(done) {
      var messageID = 'x' + message.message_id;
      var p = params();

      p.body.data.id = messageID;

      handler(p, {
        succeed: function(res) {
          done(new Error('success with unknown message id'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '400');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Message not found');
          done();
        },
      });
    });
  });

  describe('without Authorization', function() {
    it('should fail with a 401 error.', function(done) {
      handler(_.omit(params(), 'Authorization'), {
        succeed: function() {
          done(new Error('success without Authorization'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authorization header should be formatted: Bearer <JWT>');
          done();
        },
      });
    });
  });
 
  describe('not authenticated as an account', function() {
    it('should fail with a 401 error.', function(done) {
      var p = params();

      p.Authorization = 'Bearer ' + recorder.at;
      handler(p, {
        succeed: function() {
          done(new Error('Success without account authentication'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '401');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Caller must be authenticated as message recipient');
          done();
        },
      });
    });
  });

  describe('authenticated caller is not recipient of message', function() {
    it('should fail with a 403 error.', function(done) {
      var p = params();

      p.Authorization = 'Bearer ' + sender.at;
      handler(p, {
        succeed: function() {
          done(new Error('success without recipient authentication'));
        },
        fail: function(err) {
          expect(err).to.have.property('message', '403');
          expect(JSON.parse(err.name)).to.have.property('detail', 'Authenticated user is not recipient of the specified message');
          done();
        },
      });
    });
  });
});
