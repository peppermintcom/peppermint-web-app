var expect = require('chai').expect;
var handler = require('./').handler;
var _ = require('utils/test');

describe.only('lambda:ReadMessage', function() {
  var recipient, message;
  var params;

  before(function() {
    return Promise.all([
       _.fake.account(),
    ])
    .then(function(results) {
      recipient = results[0];
    });
  });

  before(function() {
    return Promise.all([
      _.fake.message(null, recipient),
    ])
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
});
