var fs = require('fs');
var path = require('path');
var util = require('util');
var swagger = require('swagger-tools');

module.exports = function() {
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
        fs.readdirSync(path.join('resources', resource)).forEach(function(f) {
          var key = path.join('/', resource);
          var p = paths[key] = paths[key] || {};
     
          if (methods[f]) {
            p[f] = require(['..', 'resources', resource, f, 'spec'].join(path.sep));
          }
        });
        return paths;
      }, {});
  var spec = {
    swagger: '2.0',
    info: {
      title: 'Peppermint.com',
      version: '1.0.0',
    },
    basePath: '/v1',
    paths: paths,
    definitions: require('../definitions'),
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
