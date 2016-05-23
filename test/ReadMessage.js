var expect = require('chai').expect;
var tv4 = require('tv4');
var spec = require('../resources/reads/post/spec.js');
var jsonapischema = require('./jsonapischema.json');
var _ = require('./utils');
var post = _.partial(_.http, 'POST', '/reads');

function body(id) {
  return {
    data: {
      id: id,
      type: 'reads',
    },
  };
}

describe('POST /reads', function() {
  var sender, recipient, recorder, message, msgs;
  var headers;

  before(function() {
    return Promise.all([
      _.fake.account(),
      _.fake.account(),
      _.fake.recorder2(),
    ]).then(function(results) {
      sender = results[0];
      recipient = results[1];
      recorder = results[2];

      return Promise.all([
        _.fake.messages({sender: sender, recipient: recipient, unread: 5}),
        _.http('POST', '/jwts', null, {
          Authorization: _.peppermintScheme(null, null, recipient.email, recipient.password),
          'X-Api-Key': _.fake.API_KEY,
        }),
        _.http('POST', '/jwts', null, {
          Authorization: _.peppermintScheme(null, null, sender.email, sender.password),
          'X-Api-Key': _.fake.API_KEY,
        }),
        _.http('POST', '/jwts', null, {
          Authorization: _.peppermintScheme(recorder.recorder_client_id, recorder.recorder_key),
          'X-Api-Key': _.fake.API_KEY,
        }),
      ]);
    })
    .then(function(results) {
      recipient.jwt = results[1].body.data.attributes.token;
      sender.jwt = results[2].body.data.attributes.token;
      recorder.jwt = results[3].body.data.attributes.token;
      msgs = results[0].sort(function(msg1, msg2) {
        if (msg1.created < msg2.created) return -1;
        if (msg2.created < msg1.created) return 1;
        return 0;
      })
      //5 messages, get the middle one in terms of created time
      message = msgs[2]

      headers = function() {
        return {
          Authorization: 'Bearer ' + recipient.jwt,
          'Content-Type': 'application/vnd.api+json',
          'X-Api-Key': _.fake.API_KEY,
        };
      };
    });
  });

  it('should mark the message and all precdeing messages as read.', function() {
    return post(body(message.message_id), headers())
      .then(function(response) {
        expect(response.statusCode).to.equal(204);
        expect(response.headers).not.to.have.property('content-type');
        expect(response.body).to.be.undefined;

        return Promise.all(msgs.map(function(msg) {
          return _.messages.get(msg.message_id);
        }))
      })
      .then(function(results) {
        console.log(results)
        for (var i = 0; i < 3; i++) {
          expect(results[i]).to.have.property('read');
          //10 minute window to allow for clock differences
          expect(results[i].read).to.be.within(Date.now() - 300000, Date.now() + 300000)
        }
        for (var i = 3; i < 5; i++) {
          expect(results[i].read).not.to.be.ok;
        }
      })
  });

  describe('common client errors', function() {
    _.clientErrors(spec, function() {
      return {
        method: 'POST',
        url: '/reads',
        body: body(),
        headers: headers(),
      };
    });
  });

  describe('Authorization header only authenticates a recorder', function() {
    _.fail(401, 'Caller must be authenticated as message recipient', spec, function() {
      return {
        method: 'POST',
        url: '/reads',
        body: body(message.message_id),
        headers: _.assign(headers(), {Authorization: 'Bearer ' + recorder.jwt}),
      };
    });
  });

  describe('Authorization header authenticates a different account than the recipient', function() {
    _.fail(403, 'Forbidden', spec, function() {
      return {
        method: 'POST',
        url: '/reads',
        body: body(message.message_id),
        headers: _.assign(headers(), {Authorization: 'Bearer ' + sender.jwt}),
      };
    });
  });

  describe('without id in request', function() {
    _.fail(400, 'Missing required property: id', spec, function() {
      var b = body();
      delete b.data.id;

      return {
        method: 'POST',
        url: '/reads',
        body: b,
        headers: headers(),
      };
    });
  });

  describe('unformatted body', function() {
    _.fail(400, 'Missing required property: data', spec, function() {
      return {
        method: 'POST',
        url: '/reads',
        body: {id: message.message_id, type: 'reads'},
        headers: headers(),
      };
    });
  });

  describe('wrong type', function() {
    _.fail(400, 'String does not match pattern: ^reads$', spec, function() {
      var b = body(message.message_id);

      b.data.type = 'messages';
      return {
        method: 'POST',
        url: '/reads',
        body: b,
        headers: headers(),
      };
    });
  });

  describe('message not found', function() {
    _.fail(400, 'Message not found', spec, function() {
      var b = body(message.message_id);

      b.data.id += 'x';
      return {
        method: 'POST',
        url: '/reads',
        body: b,
        headers: headers(),
      };
    });
  });

  describe('application/json', function() {
    _.fail(415, 'Use "application/vnd.api+json"', spec, function() {
      return {
        method: 'POST',
        url: '/reads',
        body: JSON.stringify(body(message.message_id)),
        headers: _.assign(headers(), {'Content-Type': 'application/json'}),
      };
    });
  });
});
