var fs = require('fs');
var path = require('path');
var path = require('path');
var util = require('util');
var swagger = require('swagger-tools');

var readme = fs.readFileSync(path.join(__dirname, '../definitions/README.md')).toString();

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
  var paths = fs.readdirSync(path.join(__dirname, '../resources'))
      .reduce(function(paths, resource) {
        var key = path.join('/', resource);
        var p = paths[key] = paths[key] || {};
 
        fs.readdirSync(path.join('resources', resource)).forEach(function(f) {
          if (methods[f]) {
            p[f] = require(['..', 'resources', resource, f, 'spec'].join(path.sep));
          }
        });
        //add OPTIONS method for each resource
        paths[key].options = {
          tags: ['cors'],
          responses: {
            '200': {
              description: 'OPTIONS for ' + key,
              headers: {
                'Access-Control-Allow-Origin': {type: 'string'},
                'Access-Control-Allow-Methods': {type: 'string'},
                'Access-Control-Allow-Headers': {type: 'string'},
              },
            },
          },
          'x-amazon-apigateway-aut': {type: 'none'},
          'x-amazon-apigateway-integration': {
            type: 'mock',
            requestTemplates: {
              'application/json': '{"statusCode": 200}',
            },
            requestParameters: {},
            responses: {
              'default': {
                statusCode: '200',
                responseParameters: {
                  'method.response.header.Access-Control-Allow-Origin': "'*'",
                  'method.response.header.Access-Control-Allow-Methods': "'POST'",
                  'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization'",
                },
                responseTemplates: {},
              },
            },
          },
        };
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
