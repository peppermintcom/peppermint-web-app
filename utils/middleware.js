var tv4 = require('tv4');
var _ = require('lodash');
var jwt = require('./jwt');
var apps = require('./apps');
var bodySchema = require('./bodySchema');

exports.process = function(handlers) {
  if (!handlers.length) {
    throw new Error('at least 1 handler is required');
  }
  handlers.forEach(function(h) {
    if (typeof h !== 'function') {
      throw new Error(h + ' is not a function');
    }
    if (h.length !== 2) {
      throw new Error('handlers get two arguments');
    }
  });

  return function(request, reply) {
    next(0, request);

    function next(i, state) {
      if (i < handlers.length) {
        handlers[i](state, {
          succeed: function(result) {
            next(i + 1, result);
          },
          fail: function(err) {
            var e = new Error(err.status);

            e.name = JSON.stringify(_.pick(err, 'detail', 'title', 'code'));
            reply.fail(e);
          },
        });
      } else {
        reply.succeed(state);
      }
    }
  };
};

/**
 * Checks and parses the JWT from an Authorization Bearer header.
 * Adds a "JWT" property to the request if authentication is ok.
 * @param {Authorization} string
 */
exports.authenticate = function(request, reply) {
  var parts = (request.Authorization || '').trim().split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    reply.fail({
      status: '401',
      detail: 'Authorization header should be formatted: Bearer <JWT>',
    });
    return;
  }

  request.jwt = jwt.verify(parts[1]);

  if (request.jwt.err) {
    reply.fail({
      status: '401',
      detail: request.jwt.err.toString(),
    });
    return;
  }

  reply.succeed(request);
};

//fails with "Bad Request" error if the api_key field is not valid. Does not
//modify the request.
exports.validateApiKey = function(request, reply) {
  if (!apps[request.api_key]) {
    reply.fail({
      status: '400',
      detail: 'invalid API Key',
    });
    return;
  }
  reply.succeed(request);
};

exports.isjsonapi = function(request, reply) {
  if (request['Content-Type'] && request['Content-Type'] !== 'application/vnd.api+json') {
    reply.fail({
      status: '415',
      detail: 'Use "application/vnd.api+json"',
    });
    return;
  }
  reply.succeed(request);
};

exports.validateBody = function(spec) {
  var schema = bodySchema(spec.parameters);

  return function(request, reply) {
    if (!tv4.validate(request.body, schema)) {
      reply.fail({
        status: '400',
        detail: tv4.error.message,
      });
      return;
    }
    reply.succeed(request);
  };
};
