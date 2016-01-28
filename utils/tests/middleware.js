var expect = require('chai').expect;
var middleware = require('../middleware');
var jwt = require('../jwt');

describe('middleware.process', function() {
  it('should call each handler with result of preceding handler.', function() {
    var req = 'x';

    middleware.process([
      function(request, reply) {
        expect(request).to.equal('x');
        reply.succeed('y');
      },
      function(request, reply) {
        expect(request).to.equal('y');
        reply.succeed('z');
      }
    ])(req, {
      succeed: function(result) {
        expect(result).to.equal('z');
      },
      fail: function(err) {
        throw err;
      },
    });
  });
});

describe('middleware.authenticate', function() {
  it('should decorate the request with a decoded JWT.', function(done) {
    var email = 'a.r@example.com';

    middleware.authenticate({
      Authorization: 'Bearer ' + jwt.encode(email, 5),
    }, {
      succeed: function(request) {
        expect(request).to.have.property('jwt');
        expect(request).to.have.property('Authorization');
        expect(request.jwt.payload).to.have.property('sub', email);
        expect(request.jwt).to.have.property('email', email);
        done();
      },
      fail: done,
    });
  });
});
