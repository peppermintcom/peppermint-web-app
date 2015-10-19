var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

var lambda = require('./build/lambda');
var swagger = require('./build/swagger');
var gateway = require('./build/gateway');

//generate swagger.json specification file
gulp.task('swagger', swagger);

//zip and upload handlers to AWS Lambda
gulp.task('lambda', function() {
  return gulp.src([
      './resources/uploads/post/index.js',
      './resources/recorder/post/index.js',
    ])
    .pipe(lambda());
});

//serve the docs with swagger-ui
gulp.task('serve', ['swagger'], function() {
  nodemon({
    script: 'server.js',
  });
});

gulp.task('deploy', ['swagger'], gateway);
