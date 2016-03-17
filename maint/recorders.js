var csp = require('js-csp');
var _ = require('utils');

//recursively calls itself until the whole table has been scanned
function scan(apiKey, out, last) {
  var params = {
    Limit: 25,
    TableName: 'recorders',
    FilterExpression: 'api_key = :api_key',
    ExpressionAttributeValues: {
      ':api_key': {S: apiKey},
    },
  };

  if (last) {
    params.ExclusiveStartKey = last;
  }

  _.dynamo.scan(params, function(err, data) {
    if (err) {
      _.log(err);
      out.close();
      return;
    }
    if (!data.Items || !data.Items.length) {
      out.close();
      return;
    }

    csp.go(function*() {
      //respect backpressure from the reader. No more calls to dynamo until the
      //current set of items has been received.
      yield csp.go(function*() {

        for (var i = 0; i < data.Items.length; i++) {
          yield csp.put(out, data.Items[i]);
        }

        if (data.LastEvaluatedKey) {
          scan(apiKey, out, data.LastEvaluatedKey);
          return;
        }
      });
    });
  });
}

function discard(item) {
  var done = csp.chan();

  console.log('deleting ' + item.client_id.S);
  console.log(item.api_key.S);

  _.dynamo.del('recorders', {
    client_id: item.client_id,
  })
  .then(function() {
    done.close();
  })
  .catch(function(err) {
    console.log(err);
  });

  return done;
}

function clean(apiKey) {
  if (!apiKey) {
    throw new Error('api_key needed');
  }
  var chan = csp.chan();
  scan(apiKey, chan);
  
  csp.go(function*() {
    var discarded = 0;
    var item;

    while ((item = yield chan) != csp.CLOSED) {
      yield discard(item);
      discarded++;
    }
    console.log('deleted ' + discarded + ' recorder items');
  });
}

clean();
