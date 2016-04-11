var csp = require('js-csp');
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

  csp.go(function*() {
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

//mutates the existentPathnames and nonexistentPathnames arguments
function isGarbage(existentPathnames, nonexistentPathnames, pathname) {
  var done = csp.chan();

  csp.go(function*() {
    if (existentPathnames[pathname]) {
      yield csp.put(done, false);
      done.close();
    }
    if (nonexistentPathnames[pathname]) {
      yield csp.put(done, true);
      done.close();
    }

    _.uploads.get(pathname)
      .then(function(upload) {
        if (upload) {
          existentPathnames[pathname] = true;
          csp.putAsync(done, false);
        } else {
          nonexistentPathnames[pathname] = true;
          csp.putAsync(done, true);
        }
        done.close();
      })
      .catch(function(err) {
        console.log(err);
      });
  });
 
  return done;
}

exports.isGarbage = isGarbage;
exports.discard = discard;
exports.discardPathnames = discardPathnames;