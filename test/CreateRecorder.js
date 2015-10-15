var expect = require('chai').expect;
var request = require('request');

describe('POST /recorder', function() {
  var clientID = Date.now().toString();
  var params = {
    recorder: {
      recorder_client_id: clientID,
    },
  };
  var res = null;
  var body = null;

  describe('Valid Requests', function() {
    before(function(done) {
      request({
        url: 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/recorder',
        method: 'POST',
        json: true,
        body: {
          api_key: 'abc123',
          recorder: {
            recorder_client_id: clientID,
            description: 'Mocha',
          },
        }
      }, function(err, r, b) {
        if (err) {
          done(err);
          return;
        }
        res = r;
        body = b;
        done();
      });
    });

    it('should return a 201 status code', function() {
      expect(res.statusCode).to.equal(201);
    });

    it('should return a full representation of the Recorder resource.', function() {
      expect(body).to.have.property('at');
      expect(body).to.have.property('recorder');
      expect(body.recorder).to.have.property('recorder_client_id', clientID);
      expect(body.recorder).to.have.property('description', 'Mocha');
    });
  });

  describe('Invalid Input Data', function() {
    describe('without recorder_client_id', function() {
      before(function(done) {
        request({
          url: 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1/recorder',
          method: 'POST',
          json: true,
          body: {
            api_key: 'abc123',
            recorder: {
              description: 'Mocha',
            },
          }
        }, function(err, r, b) {
          if (err) {
            done(err);
            return;
          }
          res = r;
          body = b;
          done();
        });
      });

      it('should return status code 400.', function() {
        expect(res.statusCode).to.equal(400);
      });
    });
  });
});
