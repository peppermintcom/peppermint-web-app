var expect = require('chai').expect;
var auth = require('../auth');

describe('Peppermint Authentication Scheme', function() {
  describe('isValid', function() {
    describe('valid values', function() {
      it('should return true.', function() {
        [
          'Peppermint recorder=abc',
          'peppermint account=abc',
          'peppermint recorder=abc, account=xyz',
          'Peppermint account=abc, recorder=xyz',
        ].forEach(function(v) {
          if (!auth.isValid(v)) {
            throw new Error(v);
          }
        });
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
    ].forEach(function(v) {
      describe('"' + v + '"', function() {
        it('should return false.', function() {
          expect(auth.isValid(v)).to.equal(false);
        });
      });
    });
  });
});
