var expect = require('chai').expect;
var auth = require('../auth');
var _ = require('lodash');

describe('Peppermint Authentication Scheme', function() {
  describe('isValid', function() {
    describe('valid values', function() {
      it('should return true.', function() {
        [
          'Peppermint recorder=abc',
          'peppermint account=abc',
          'peppermint recorder=abc, account=xyz',
          'Peppermint account=abc, recorder=xyz',
          'Peppermint account=++//==, recorder=////=',
          'Peppermint recorder=LTV5aVNmeWw1MWVjOm16WXRVWnU0eXN6Y21hN181dl84d1RLVWN1eVFMcVZBMzQ5WVloSmE=, account=eU5tQzJuZEZBS3QyQG1haWxpbmF0b3IuY29tOnNlY3JldA==',
        ].forEach(function(v) {
          if (!auth.isValid(v)) {
            throw new Error(v);
          }
        });
      });
    });

    describe('invalid values', function() {
      [
        'peppermint',
        'Peppermint',
        'Peppermint recorder',
        'Peppermint recorder=',
        'Peppermint account',
        'Peppermintaccount=abc',
        'Peppermintrecorder=abc',
        'Peppermint recorder=account=abc',
        'Peppermint recorderaccount=abc',
        'Peppermint recorder=abc recorder=xyz',
        'Pepermint recorder=abc',
        'Peppermint recorder=abc account=xyz',
        'peppermint recorder=abcaccount=xyz',
        'Peppermint recorder=abc, account=xyz, recorder=def',
        'Peppermint recorder= xyz',
        'Peppermint recorder =xyz',
        'Peppermint recorder=$xyz',
      ].forEach(function(v) {
        describe('"' + v + '"', function() {
          it('should return false.', function() {
            expect(auth.isValid(v)).to.equal(false);
          });
        });
      });
    });
  });

  describe('encodedCreds', function() {
    [
      ['Peppermint recorder=xyz=, account=abc==', {recorder: 'xyz=', account: 'abc=='}],
      ['Peppermint recorder=xyz', {recorder: 'xyz', account: null}],
      ['Peppermint account=abc', {recorder: null, account: 'abc'}],
      ['Peppermint account=abc, recorder=xyz', {recorder: 'xyz', account: 'abc'}],
    ].forEach(function(v) {
      var header = v[0];
      var answer = v[1];

      describe(header, function() {
        it('should return ' + JSON.stringify(answer), function() {
          expect(auth.encodedCreds(header)).to.deep.equal(answer);
        });
      });
    });
  });

  describe('creds', function() {
    [
      {recorder: 'xyz:789', account: 'abc:123'},
      {recorder: null, account: 'abc:1234'},
      {recorder: 'xyz:09877', account: null},
    ].forEach(function(v) {
      var encoded = _.mapValues(v, function(v) {
        return v && Buffer(v).toString('base64');
      });
      describe(JSON.stringify(encoded), function() {
        it(JSON.stringify(v), function() {
          expect(auth.creds(encoded)).to.deep.equal(v);
        });
      });
    });
  });

  describe('credsObj', function() {
    [
      [{recorder: 'xyz:789', account: 'abc:123'}, {
        recorder: {user: 'xyz', password: '789'},
        account: {user: 'abc', password: '123'},
      }],
      [{recorder: 'xyz:789', account: null}, {
        recorder: {user: 'xyz', password: '789'},
        account: null,
      }],
    ].forEach(function(r) {
      var input = r[0];
      var answer = r[1];
      var result = auth.credsObj(input);

      describe(JSON.stringify(input), function() {
        it(JSON.stringify(answer), function() {
          expect(result).to.deep.equal(answer);
        });
      });
    });
  });
});
