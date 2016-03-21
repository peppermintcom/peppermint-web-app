var _ = require('./utils');

function alias(pathname) {
  var done = _.chan();

  _.dynamo.fetch('short-urls', 'pathname-index', 'pathname', {S: pathname})
    .then(function(item) {
      csp.putAsync(done, item.key.S);
    })
    .catch(function(err) {
      _.putAsync(done, err);
    })
    .then(function() {
      done.close();
    });

  return done;
}

function mapKey(pathnames) {
  var keys = _.chan();
  var errors = _.chan();

  _.go(function*() {
    var pathname;

    while ((pathname = yield pathname) != _.CLOSED) {
      var key = yield resolve(pathname);

      if (_.isError(key)) {
        yield _.put(errors, key);
        continue;
      }

      yield _.put(keys, key);
    }
    keys.close();
    errors.close();
  });
 
  return {
    ok: keys,
    errors: errors,
  };
}

var discard = _.partial(_.batchAndDiscard, 'short-urls', _.identity);

function discardPathnames(pathnames) {
  var keys = mapKey(pathnames);
  var errors = discard(keys.ok);

  return _.merge(keys.errors, errors);
}

exports.discard = discard;
exports.discardPathnames = discardPathnames;
