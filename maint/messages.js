var _ = require('./utils');

//Returns a channel with all messages matching a pathname. Closes the channel
//when done. The done channel will carry a single array or error.
function pathnameMessages(pathname) {
  var done = _.chan();

  _.messages.queryPathname(pathname)
    .then(function(messages) {
      _.putAsync(done, messages);
      messages.forEach(put);
    })
    .catch(function(err) {
      _.putAsync(errors, err);
    })
    .then(function() {
      done.close();
    });

  return done;
}

//Returns a channel contain the (many) mesages related to each pathname in the
//source channel.
function messages(pathnames) {
  var messages = _.chan();
  var errors = _.chan();

  csp.go(function*() {
    var pathname;

    while ((pathname = yield pathnames) != _.CLOSED) {
      
    }
  });

  return {
    ok: messages,
    errors: errors,
  };
}

function discardPathname(pathnames) {
  _.go(function*() {
    var pathname;

    while ((pathname = yield pathnames) != _.CLOSED) {

    }
  });
}
