var expect = require('chai').expect;
var auth = require('../auth');
var _ = require('lodash');

describe('Facebook auth', function() {
  var email = 'andrew@areed.io';
  var name = 'Andrew Reed';
  //https://developers.facebook.com/tools/explorer/
  var accessToken = process.env.FACEBOOK_AT;

  it('should return an email and full_name.', function() {
    return auth.facebook({user: email, password: accessToken})
      .then(function(user) {
        expect(user).to.have.property('email', email);
        expect(user).to.have.property('full_name', 'Andrew Reed');
        expect(user).to.have.property('source', 'facebook');
      });
  });

  describe('invalid access token', function() {
    var badErr = new Error('success with bad access token');

    it('should throw an error.', function() {
      return auth.facebook({user: email, password: 'x' + accessToken})
        .then(function() {
          throw badErr;
        })
        .catch(function(err) {
          if (err === badErr) {
            throw err;
          }
          expect(err.message).to.equal('401');
        });
    });
  });
});

describe('Google auth', function() {
  it('should return an email and full_name.', function() {
    var email = 'andrew@areed.io';
    var name = 'Andrew Reed';
    //https://developers.google.com/oauthplayground
    var accessToken = process.env.GOOGLE_AT;

    return auth.google({user: email, password: accessToken})
      .then(function(user) {
        expect(user).to.have.property('email', email);
        expect(user).to.have.property('full_name', name);
      });
  });
});

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
          'Peppermint google=abc==',
          'Peppermint google=abc=, recorder=xyz',
          'Peppermint recorder=z==, google=/',
          'Peppermint facebook=xyz',
          'Peppermint facebook=xyz=, recorder=abc=',
          'Peppermint recorder=abc, facebook=xyz==',
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
        'Peppermint account=xyz, google=abc',
        'Peppermint google=abc, account=xyz',
        'Peppermint google=abc, facebook=xyz',
        'Peppermint google=abc, google=abc',
        'Peppermint facebook=abc, google=xyz',
        'Peppermint facebook=abc, account=xyz',
        'Peppermint facebook=abc, google=xyz, recorder=789=',
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
      ['Peppermint recorder=xyz=, account=abc==', {recorder: 'xyz=', account: 'abc==', google: null, facebook: null}],
      ['Peppermint recorder=xyz', {recorder: 'xyz', account: null, google: null, facebook: null}],
      ['Peppermint account=abc', {recorder: null, account: 'abc', google: null, facebook: null}],
      ['Peppermint account=abc, recorder=xyz', {recorder: 'xyz', account: 'abc', google: null, facebook: null}],
      ['peppermint google=abc', {recorder: null, account: null, google: 'abc', facebook: null}],
      ['Peppermint google=abc, recorder=xyz', {recorder: 'xyz', google: 'abc', account: null, facebook: null}],
      ['Peppermint facebook=abc', {recorder: null, account: null, google: null, facebook: 'abc'}],
      ['peppermint recorder=abc, facebook=xyz', {recorder: 'abc', facebook: 'xyz', google: null, account: null}],
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
      {recorder: 'xyz:789', account: 'abc:123', google: null, facebook: null},
      {recorder: null, account: 'abc:1234', google: null, facebook: null},
      {recorder: 'xyz:09877', account: null, google: null, facebook: null},
      {recorder: null, account: null, google: 'abc:123', facebook: null},
      {recorder: 'xyz:890', account: null, google: 'abc:123', facebook: null},
      {recorder: null, account: null, google: null, facebook: 'def:456'},
      {recorder: 'xyz:789', account: null, google: null, facebook: 'def:456'},
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
      [{recorder: 'xyz:789', account: 'abc:123', google: null, facebook: null}, {
        recorder: {user: 'xyz', password: '789'},
        account: {user: 'abc', password: '123'},
        google: null,
        facebook: null,
      }],
      [{recorder: 'xyz:789', account: null, google: null, facebook: null}, {
        recorder: {user: 'xyz', password: '789'},
        account: null,
        google: null,
        facebook: null,
      }],
      [{recorder: null, account: null, google: 'abc:123', facebook: null}, {
        recorder: null,
        account: null,
        google: {user: 'abc', password: '123'},
        facebook: null,
      }],
      [{recorder: 'xyz:879', account: null, google: null, facebook: 'def:456'}, {
        recorder: {user: 'xyz', password: '879'},
        account: null,
        google: null,
        facebook: {user: 'def', password: '456'},
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
