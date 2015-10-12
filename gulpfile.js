var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

var lambda = require('./build/lambda');

//generate swagger.json specification file
gulp.task('swagger', function() {
  var methods = {
    'get': true,
    'post': true,
    'put': true,
    'delete': true,
    'patch': true,
  };

  //generate paths object from resources directory
  var paths = fs.readdirSync('resources').reduce(function(paths, resource) {
    fs.readdirSync(path.join('resources', resource)).forEach(function(f) {
      var key = path.join('/', resource);
      var p = paths[key] = paths[key] || {};
 
      if (methods[f]) {
        p[f] = require(['.', 'resources', resource, f, 'spec'].join(path.sep));
      }
    });
    return paths;
  }, {});

  fs.writeFileSync('swagger.json', JSON.stringify({
    swagger: '2.0',
    info: {
      info: 'Peppermint.com',
      version: '1.0.0',
    },
    basePath: '/v1',
    paths: paths,
    //TODO definitions
  }));
});

//upload handlers to AWS Lambda
gulp.task('lambda', function() {
  return gulp.src('resources/recorder/post/index.js')
  .pipe(lambda());
});

gulp.task('serve', function() {
  nodemon({
    script: 'server.js',
  });
});
