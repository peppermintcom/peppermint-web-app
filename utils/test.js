var expect = require('chai').expect;
var _ = require('./');

describe('timestamp', function() {
  [
    ['Thu Oct 15 2015 13:17:10 GMT+0700 (ICT)', '2015-10-15 06:17:10'],
    ['Thu Oct 15 2015 05:05:05 GMT+0700 (ICT)', '2015-10-14 22:05:05'],
  ].forEach(function(t) {
    var input = t[0];
    var answer = t[1];
    var output = _.timestamp(input);

    describe(input, function() {
      it('should equal ' + answer, function() {
        expect(output).to.equal(answer);
      });
    });
  });
});

describe('token', function() {
  it('should generate base64url strings.', function() {
    var t = _.token(1024);
    expect(t).to.match(/^[a-zA-Z0-9\-_]{1024}$/);
    expect(t).to.match(/[a-z]/);
    expect(t).to.match(/[A-Z]/);
    expect(t).to.match(/[0-9]/);
    expect(t).to.match(/[\-_]/);
  });
});

describe('jwt', function() {
  var recorder_id = 12345;

  it('should generate a token', function() {
    var token = _.jwt(null, recorder_id);
    var decoded = _.jwtVerify(token);

    expect(decoded).not.to.have.property('err');
    expect(decoded).to.have.property('payload');
    expect(decoded.payload).to.have.property('exp');
    expect(decoded.payload).to.have.property('sub', '.' + recorder_id);
  });
});

describe('authenticate', function() {
  it('should parse and verify an Authorization header with a Bearer token', function() {
    var token = _.jwt(null, 1);
    var jwt = _.authenticate('Bearer ' + token);

    expect(jwt).to.have.property('payload');
    expect(jwt).not.to.have.property('err');
    expect(jwt).to.have.property('recorder_id', 1);

    jwt = _.authenticate(token);
    expect(jwt).to.have.property('err');

    jwt = _.authenticate('Bearer ' + 'x' + token);
    expect(jwt).to.have.property('err');
  });
});
