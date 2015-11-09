var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

var lambda = require('./build/lambda');
var swagger = require('./build/swagger');
var gateway = require('./build/gateway');
var publishSpec = require('./build/publishSpec');

//generate swagger.json specification file for defining the API
gulp.task('swagger', function() {
  swagger(false);
});
//generate swagger.json for use with Swagger-UI
gulp.task('swaggerUI', function() {
  swagger(true);
});

//zip and upload handlers to AWS Lambda
gulp.task('lambda', function() {
  return gulp.src(methodHandlers())
    .pipe(lambda());
});

//serve the docs with swagger-ui
gulp.task('serve', ['swaggerUI'], function() {
  nodemon({
    script: 'server.js',
  });
});

gulp.task('deploy', ['swagger'], gateway);

gulp.task('publishSpec', ['swaggerUI'], publishSpec);
