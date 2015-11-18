var fs = require('fs');
var path = require('path');
var path = require('path');
var util = require('util');
var swagger = require('swagger-tools');
var sources = require('./sources');
var _ = require('utils');

var readme = fs.readFileSync(path.join(__dirname, '../definitions/README.md')).toString();
const OPTIONS = {
  tags: ['cors'],
  responses: {
    '200': {
      description: 'OPTIONS',
      headers: {
        'Access-Control-Allow-Origin': {type: 'string'},
        'Access-Control-Allow-Methods': {type: 'string'},
        'Access-Control-Allow-Headers': {type: 'string'},
      },
    },
  },
  'x-amazon-apigateway-integration': {
    type: 'mock',
    requestTemplates: {
      'application/json': '{"statusCode": 200}',
    },
    responses: {
      'default': {
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization'",
        },
      },
    },
  },
};

/**
 * @param {Boolean} stage - whether to prefix basePath with 'prod'
 */
module.exports = function(stage) {
  var methods = {
    'get': true,
    'post': true,
    'put': true,
    'delete': true,
    'patch': true,
  };

  //generate paths object from resources directory
  var paths = sources.paths.reduce(function(paths, resource) {
    var key = path.join('/', resource);
    var p = paths[key] = paths[key] || {};

    fs.readdirSync(path.join('resources', resource)).forEach(function(f) {
      if (methods[f]) {
        var methodSpec = require(['..', 'resources', resource, f, 'spec'].join(path.sep));
        if (methodSpec.path) {
          paths[methodSpec.path] = paths[methodSpec.path] || {};
          paths[methodSpec.path][f] = _.omit(methodSpec, 'path');
          paths[methodSpec.path].options = _.assign({}, OPTIONS, {
            parameters: [
              {
                name: 'account_id',
                'in': 'path',
                type: 'string',
                required: true,
              },
            ],
          });
        } else {
          p[f] = require(['..', 'resources', resource, f, 'spec'].join(path.sep));
        }
      }
    });
    //add OPTIONS method for each resource
    paths[key].options = OPTIONS;
    return paths;
  }, {});

  var spec = {
    swagger: '2.0',
    info: {
      title: 'Peppermint.com',
      description: readme,
      version: '1.0.0',
    },
    host: 'qdkkavugcd.execute-api.us-west-2.amazonaws.com',
    basePath: stage ? '/prod/v1' : '/v1',
    schemes: ['https'],
    paths: paths,
    tags: [
      {name: 'recorder'},
    ],
  };

  fs.writeFileSync('swagger.json', JSON.stringify(spec));

  swagger.specs.v2.validate(spec, function(err, res) {
    if (err) throw err;
    if (!res) return;

    res.errors.concat(res.warnings).forEach(function(err) {
      console.log(util.inspect(err, {depth: null}));
    });
  });
};
