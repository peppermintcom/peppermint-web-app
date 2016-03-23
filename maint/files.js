var s3 = new AWS.S3();
var _ = require('./utils');

//wrapper around s3.deleteObjects that returns a channel that it closes when
//done, possibly after sending an error.
function deleteObjects(keys) {
  var done = _.chan();

  s3.deleteObjects({
    Bucket: 'peppermint-cdn',
    Delete: {
      Objects: _.map(keys, function(key) {
        return {Key: key};
      }),
    },
  }, function(err) {
    if (err) {
      _.putAsync(done, err);
    }
    done.close();
  });

  return done;
}

//batches keys on source channel and passes to deleteObjects
function discard(source) {
  var batches = _.batcher(10, source);
  var errors = _.chan();

  _.go(function*() {
    var batch;

    while ((batch = yield batches) != _.CLOSED) {
      var err = yield deleteObjects(batch);

      if (err) yield _.put(errors, err);
    }
  });

  return errors;
}
