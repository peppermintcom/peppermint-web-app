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

function batch(max, ins) {
  var out = csp.chan();
  var batch = [];
  var item;
 
  while ((batch.length <= max) && (item = csp.poll(ins)) != csp.NO_VALUE) {
    batch.push(item);
  }

  return batch;
}

exports.WEEK = WEEK;
exports.scan = scan;
exports.discard = discard;
exports.batchDiscard = batchDiscard;
exports.batch = batch;

module.exports = _.assign(exports, _);
