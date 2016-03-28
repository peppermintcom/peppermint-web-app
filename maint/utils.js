var fs = require('fs');
var csp = require('js-csp');
var _ = require('utils');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

//Scan a table and send the items to an out channel. Handles paging with
//recursive calls. Out channel will be created and returned if it is not passed
//in.
function scan(params, out) {
  out = out || csp.chan();

  _.dynamo.scan(params, function(err, data) {
    if (err) {
      _.log(err);
      out.close();
      return;
    }

    //respect backpressure from the reader. No more calls to dynamo until the
    //current set of items has been received.
    csp.go(function*() {
      if (data.Items && data.Items.length) {
        for (var i = 0; i < data.Items.length; i++) {
          yield csp.put(out, data.Items[i]);
        }
      }

      if (data.LastEvaluatedKey) {
        scan(_.assign({}, params, {ExclusiveStartKey: data.LastEvaluatedKey}), out);
      } else {
        out.close();
      }
    });
  });

  return out;
}

//Returns a done channel that is closed after the item has been deleted.
function discard(table, key) {
  var done = csp.chan();

  _.dynamo.del(table, key)
    .then(function() {
      done.close();
    })
    .catch(function(err) {
      _.log(err);
      done.close();
    });

  return done;
}

//Returns a done channel that is closed after the batch of items has been
//deleted.
function batchDiscard(table, keys) {
  var done = csp.chan();
  var params = {
    RequestItems: {},
  };

  params.RequestItems[table] = _.map(keys, function(key) {
    return {
      DeleteRequest: {
        Key: key,
      },
    };
  });

  _.dynamo.batchWriteItem(params, function(err, data) {
    if (err) {
      csp.putAsync(done, err);
    }
    done.close();
  });

  return done;
}

//Batches items on the source channel in groups of 25 then deletes them from the
//table. Returnes an errors channel that is closed when the source channel is
//closed.
//@param {String} tableName
//@param {Function} key - maps the full item to the key
//@param {Channel} Source
function batchAndDiscard(tableName, key, source) {
  var batches = batcher(25, source);
  var errors = csp.chan();
  var ok = csp.chan();

  csp.go(function*() {
    var batch;

    while ((batch = yield batches) != csp.CLOSED) {
      var err = yield batchDiscard(tableName, _.map(batch, key));

      if (err) yield csp.put(errors, err);
      else {
        for (var i = 0; i < batch.length; i++) {
          yield csp.put(ok, batch[i]);
        }
      }
    }
    errors.close();
    ok.close();
  });

  return {
    ok: ok,
    errors: errors,
  };
}

//Returns an array of up to max messages from channel ins.
function batch(max, ins) {
  var batch = [];
  var item;
 
  while ((batch.length <= max) && (item = csp.poll(ins)) != csp.NO_VALUE) {
    batch.push(item);
  }

  return batch;
}

//Returns a new channel with messages batched in arrays up to length max.
function batcher(max, source) {
  var out = csp.chan();
  var batch = [];

  csp.go(function*() {
    var x;

    while ((x = yield source) != csp.CLOSED) {
      batch.push(x);

      if (batch.length == max) {
        yield csp.put(out, batch);
        batch = [];
      }
    }
    if (batch.length) {
      yield csp.put(out, batch);
    }
  });

  return out;
}

//Drops all messages on a channel, optionally logging them.
//@param {Channel} source
//@param {Boolean} log
function devnull(source, log) {
  csp.go(function*() {
    var x;

    while ((x = yield source) != csp.CLOSED) {
      if (log) _.log(x);
    }
  });
}

//Returns an object with a pass channel containing all messages that pass the
//filter and a fail channel with the rest.
//@param {Channel} source
//@param {Function -> Channel} test - channel should return a single boolean or
//error
//@return {Object} pass, fail, errors - will be closed when source is closed
function filterAsync(source, test) {
  var pass = csp.chan();
  var fail = csp.chan();
  var errors = csp.chan();

  csp.go(function*() {
    var x;

    while ((x = yield source) != csp.CLOSED) {
      var ok = yield test(x);

      if (_.isError(ok)) {
        yield csp.put(errors, ok);
        continue;
      }
      yield csp.put(ok ? pass : fail, x);
    }
    pass.close();
    fail.close();
    errors.close();
  });

  return {
    pass: pass,
    fail: fail,
    errors: errors,
  };
}

//map a channel
function mapChan(f, chan) {
  var out = csp.chan();

  csp.go(function*() {
    var x;

    while ((x = yield chan) != csp.CLOSED) {
      yield csp.put(out, f(x));
    }
    out.close();
  });

  return out;
}

//log all messages to stdout
function stdout(source) {
  csp.go(function*() {
    var x;

    while ((x = yield source) != csp.CLOSED) {
      console.log(x);
    }
  });
}

//log all message to stderr
function stderr(source) {
  csp.go(function*() {
    var err;

    while ((err = yield source) != csp.CLOSED) {
      console.error(util.inspect(err, {depth: null}));
    }
  });
}

//writes each message to a line in the file
function fileSink(name, source) {
  csp.go(function*() {
    var x;

    while ((x = yield source) != csp.CLOSED) {
      fs.appendFile(name, x.toString() + '\n', function(err, done) {
        if (err) console.log(err);
      });
    }
  });
}

//converts a readable to a channel with backpressure
function fileSourceRaw(name) {
  var out = csp.chan();
  var stream = fs.createReadStream(name);

  stream.on('readable', function() {
    csp.go(function*() {
      var chunk;

      while ((chunk = stream.read()) != null) {
        yield csp.put(out, chunk);
      }
    });
  });
  stream.on('end', function() {
    out.close();
  });

  return out;
}

//reads lines from a file to a channel; empty lines are dropped
function fileSource(name) {
  var source = fileSourceRaw(name);
  var out = csp.chan();

  csp.go(function*() {
    var state = '';
    var chunk;

    while ((chunk = yield source) != csp.CLOSED) {
      var lines = (state + chunk.toString()).split('\n');
      state = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        yield csp.put(out, lines[i]);
      }
    }
    if (state) {
      yield csp.put(out, state);
    }
    out.close();
  });

  return out;
}

function isWeekOld(when) {
  var weekAgo = Date.now() - _.WEEK;

  return when <= weekAgo;
}

exports.WEEK = WEEK;
exports.scan = scan;
exports.discard = discard;
exports.batchDiscard = batchDiscard;
exports.batch = batch;
exports.batchAndDiscard = batchAndDiscard;
exports.devnull = devnull;
exports.filterAsync = filterAsync;
exports.mapChan = mapChan;
exports.stdout = stdout;
exports.stderr = stderr;
exports.isWeekOld = isWeekOld;
exports.fileSink = fileSink;
exports.fileSource = fileSource;

module.exports = _.assign({}, _, exports);
