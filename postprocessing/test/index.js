var expect = require('chai').expect;
var handler = require('../').handler;
var _ = require('utils');

const KEY = 'HYAgptKg2IUZclZ3HDrfDP/hr5cclxmJqs7QSj97XgtLD.mp3';
const SIZE = 22032;

describe('lambda:Postprocess', function() {
  this.timeout(10000);

  describe('put event for mp3 that is 5.5 seconds long', function() {
    var upload;

    before(function() {
      return _.uploads.update(KEY, 'REMOVE seconds, uploaded');
    });

    it('should succeed.', function(done) {
      handler(e(KEY, SIZE), {
        fail: done,
        succeed: function() {
          _.uploads.get(KEY)
            .then(function(_upload) {
              upload = _upload;
              done();
            });
        },
      });
    });

    it('should set the duration to 6 in the database.', function() {
      expect(upload).to.have.property('seconds', 6);
    });

    it('should stamp the uploaded time in the database.', function() {
      expect(upload.uploaded).to.be.within(Date.now() - 5000, Date.now());
    });
  });
});

//mock event for put in peppermint-cdn bucket
function e(key, size) {
  return {
    Records: [{
      eventVersion: '2.0',
      eventSource: 'aws:s3',
      awsRegion: 'us-west-2',
      eventTime: '1970-01-01T00:00:00.000Z',
      eventName: 'ObjectCreated:Put',
      userIdentity: {
        principalID: 'AIDAJDPLRKLG7UEXAMPLE',
      },
      requestParameters: {
        sourceIPAddress: "127.0.0.1",
      },
      responseElements: {
        'x-amz-request-id': 'C3D13FE58DE4C810',
        'x-amz-id-2': 'FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD',
      },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'testConfigRule',
        bucket: {
          name: 'peppermint-cdn',
          ownerIdentity: {
            principalId: 'A3NL1KOZZKExample',
          },
          arn: 'arn:aws:s3:::peppermint-cdn',
        },
        object: {
          key: key,
          size: size,
          eTag: 'd41d8cd98f00b204e9800998ecf8427e',
          versionId: '096fKKXTRTtl3on89fVO.nfljtsv6qko',
          sequencer: '0055AED6DCD90281E5',
        },
      },
    }],
  };
}
