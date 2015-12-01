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
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
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
  //http://swagger.io/specification/#pathsObject
  var paths = sources.paths.reduce(function(paths, resource) {
    /**
     * Each resource is a directory such as /accounts or /accconts/tokens that
     * may contain method subdirectories or resource subdirectories.
     * Each resource that contains methods should have a key in the swagger
     * paths object. Paths that contain parameters such as
     * /accounts/{account_id} use underscores in the filesystem rather than
     * braces. /accounts/_account_id_ is converted to /accounts/{account_id}
     * with the parameterize function.
     */
    var key = parameterize(path.join('/', resource));

    //create a Path Item Object http://swagger.io/specification/#pathItemObject
    //with an Operation Object http://swagger.io/specification/#operationObject
    //property for each method subdirectory in the resource directory
    var pathItem = fs.readdirSync(path.join('resources', resource))
      //filter out subdirectories that are further resources
      .filter(function(subdir) {
        return methods[subdir];
      })
      .reduce(function(pathItem, method) {
        //every spec.js file in a method subdirectory is a valid swagger
        //Operation Object
        pathItem[method] = require(['..', 'resources', resource, method, 'spec'].join(path.sep));
        return pathItem;
      }, {});

    //every pathItem needs an OPTIONS operation object for CORS support
    pathItem.options = _.assign({}, OPTIONS, {
      parameters: (getPathParams(key) || []).map(function(param) {
        return {
          name: param.replace(/^\{/, '').replace(/\}$/, ''),
          'in': 'path',
          type: 'string',
          required: true,
        };
      }),
    });
    paths[key] = pathItem;

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

/**
 * Convert initial and trailing underscores in a path element to curly brackets,
 * making that element into a path parameter in swagger and AWS API Gateway.
 * /accounts/_account_id_ => /accounts/{account_id}
 */
function parameterize(path) {
  return path.split('/')
    .map(function(element) {
      if (/^_.*_$/.test(element)) {
        return element.replace(/^_/, '{').replace(/_$/, '}');
      }
      return element;
    })
    .join('/');
}

function getPathParams(path) {
  return path.match(/\{.+\}/g);
}
