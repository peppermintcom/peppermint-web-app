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

//Returns an array of up to max messages from channel ins.
function batch(max, ins) {
  var out = csp.chan();
  var batch = [];
  var item;
 
  while ((batch.length <= max) && (item = csp.poll(ins)) != csp.NO_VALUE) {
    batch.push(item);
  }

  return batch;
}

//Returns a channel that drops all messages.
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

//log all messages
function stdout(source) {
  csp.go(function*() {
    var x;

    while ((x = yield source) != csp.CLOSED) {
      _.log(x);
    }
  });
}

exports.WEEK = WEEK;
exports.scan = scan;
exports.discard = discard;
exports.batchDiscard = batchDiscard;
exports.batch = batch;
exports.devnull = devnull;
exports.filterAsync = filterAsync;
exports.stdout = stdout;

exports.merge = csp.operations.merge;
exports.pipe = csp.operations.pipe;
exports.spawn = csp.spawn;
exports.go = csp.go;

module.exports = _.assign(exports, _);
