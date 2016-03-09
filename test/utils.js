var expect = require('chai').expect;
var tv4 = require('tv4');
var jsonapischema = require('./jsonapischema');
var _ = require('utils/test');

function fail(code, detail, spec, getParams) {
  var response;

  before(function() {
    var params = getParams();

    return _.http(params.method, params.url, params.body, params.headers)
      .then(function(res) {
        response = res;
      });
  });

  it('should get a ' + code + ' status code.', function() {
    expect(response.statusCode).to.equal(code);
  });

  it('should get JSON API content.', function() {
    expect(response.headers).to.have.property('content-type', 'application/vnd.api+json');
    if (!tv4.validate(response.body, jsonapischema)) {
      throw tv4.error;
    }
  });

  it('should get a body error message formatted to match the spec.', function() {
    if (!tv4.validate(response.body, spec.responses[code].schema)) {
      throw tv4.error;
    }
    expect(response.body).to.deep.equal({errors: [{detail: detail}]});
  });
}

function missingXApiKeyHeader(spec, getParams) {
  fail(400, 'invalid API Key', spec, function() {
    var params = _.cloneDeep(getParams());

    delete params.headers['X-Api-Key'];

    return params;
  });
}

function invalidXApiKeyHeader(spec, getParams) {
  fail(400, 'invalid API Key', spec, function() {
    var params = _.cloneDeep(getParams());

    params.headers['X-Api-Key'] = 'xxxxxx';

    return params;
  });
}

function missingAuthorizationHeader(spec, getParams) {
  fail(401, 'Authorization header should be formatted: Bearer <JWT>', spec, function() {
    var params = _.cloneDeep(getParams());

    delete params.headers['Authorization'];

    return params;
  });
}

function invalidAuthorizationHeader(spec, getParams) {
  fail(401, 'Error: Signature verification failed', spec, function() {
    var params = _.cloneDeep(getParams());

    params.headers['Authorization'] = params.headers['Authorization'] + 'x';

    return params;
  });
}

exports.missingXApiKeyHeader = missingXApiKeyHeader;
exports.invalidXApiKeyHeader = invalidXApiKeyHeader;

exports.clientErrors = function(spec, getParams) {

  describe('missing X-Api-Key header', function() {
    missingXApiKeyHeader(spec, getParams);
  });

  describe('invalid X-Api-Key header', function() {
    invalidXApiKeyHeader(spec, getParams);
  });

  describe('missing Authorization header', function() {
    missingAuthorizationHeader(spec, getParams);
  });

  describe('invalid Authorization header', function() {
    invalidAuthorizationHeader(spec, getParams);
  });
};

exports.fail = fail;

module.exports = _.assign(_, exports);