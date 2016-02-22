var fs = require('fs');
var util = require('util');
var aws = require('aws-sdk');
var ffprobe = require('node-ffprobe');
var s3 = new aws.S3();
var conf = require('utils/conf');
var _ = require('utils');

//delay should be 10 seconds in production to ensure delivery of all messages,
//since lambda POST /messages timesout after 10 seconds.
var DELAY = conf.NODE_ENV === 'production' ? 10 * 1000 : 1;

//signal not to continue with delivery of a message
var DONE = {};

//add current directory to path so binaries uploaded in zip file can be found
process.env.PATH += ':' + process.env.LAMBDA_TASK_ROOT;

function main(e, context) {
  var start = new Date();
  fetch(e)
    .then(saveTmp)
    .then(probe)
    .then(duration)
    .then(update(start))
    .then(sleep(DELAY))
    .then(function() {
      return deliverPending(e);
    })
    .then(function() {
      context.succeed();
    })
    .catch(function(err) {
      context.fail(err);
    });
}

function fetch(e) {
  return new Promise(function(resolve, reject) {
    s3.getObject({
      Bucket: bucket(e),
      Key: key(e),
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      e.data = data;
      resolve(e);
      return; 
    });
  });
}

//write object data from s3 to /tmp
function saveTmp(e) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(tmpPath(e), e.data.Body, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(e);
    });
  });
}

//filesystem path where object will be stored locally
function tmpPath(e) {
  return '/tmp/' + key(e).split('/').pop();
}

//bucket associated with event
function bucket(e) {
  return e.Records[0].s3.bucket.name;
}

//key associated with event
function key(e) {
  return e.Records[0].s3.object.key;
}

//audio_url associated with event
function audioURL(e) {
  return 'http://go.peppermint.com/' + key(e);
};

//get duration from ffprobe analysis
function duration(e) {
  e.duration = Math.ceil(e.meta.format.duration);
  return e;
}

//save duration and uploaded stamp to item in uploads table. Use start of main
//invocation instead of e.Records[0].eventTime in case clocks between S3 and
//lambda are different, we can still see how long processing took.
function update(start) {
  return function(e) {
    return _.uploads.update(key(e), 'SET seconds = :seconds, uploaded = :uploaded, postprocessed = :now', {
      ':seconds': {N: e.duration.toString()},
      ':uploaded': {N: start.valueOf().toString()},
      ':now': {N: Date.now().toString()},
    });
  };
}

//ffprobe
function probe(e) {
  return new Promise(function(resolve, reject) {
    ffprobe(tmpPath(e), function(err, meta) {
      if (err) {
        reject(err);
        return;
      }
      e.meta = meta;
      resolve(e);
    });
  });
};

function sleep(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, ms);
  });
}

function getPendingMessages(e) {
  return _.messages.queryAudioURL(audioURL(e));
}

//attach recipient and sender accounts to message
function getAccounts(message) {
  return Promise.all([
      _.accounts.get(message.recipient_email),
      _.accounts.get(message.sender_email),
    ])
    .then(function(results) {
      message.recipient = results[0];
      message.sender = results[1];

      if (!message.sender) {
        return saveMessageResult(message.message_id, _.messages.drop_reason.NO_SENDER);
      }
      if (!message.recipient) {
        return saveMessageResult(message.message_id, _.messages.drop_reason.NO_RECIPIENT);
      }
      return message;
    });
}

//attach receivers to the message's recipient account
function getReceivers(message) {
  if (message === DONE) {
    return Promise.resolve(message);
  }

  return _.receivers.recorders(message.recipient.account_id)
    .then(function(recorders) {
      if (!recorders || !recorders.length) {
        return saveMessageResult(message.message_id, _.messages.drop_reason.NO_RECEIVER);
      }
      //only save recorders with a gcm_registration_token
      recorders = _.filter(recorders, function(recorder) {
        return recorder.gcm_registration_token;
      });
      if (!recorders.length) {
        return saveMessageResult(message.message_id, _.messages.drop_reason.NO_GCM_REGISTRATION_TOKEN);
      }
      message.recipient.receivers = recorders;
      return message;
    });
}

function deliver(message) {
  return getAccounts(message)
    .then(getReceivers)
    .then(function(message) {
      if (message === DONE) {
        return;
      }
      return _.gcm.deliver(message.recipient.receivers, message, message.sender)
        .then(function(successes) {
          return saveMessageResult(message.message_id, 'GCM success count: ' + successes);
        });
    });
}

function deliverPending(e) {
  return getPendingMessages(e)
    .then(function(messages) {
      messages = _.map(messages, function(message) {
        message.duration = e.duration;
        return message;
      });
      return Promise.all(_.map(messages, deliver));
    });
}

function saveMessageResult(messageID, result) {
  return _.messages.update(messageID, 'SET handled = :handled, handled_by = :handler, outcome = :result', {
    ':handled': {N: Date.now().toString()},
    ':handler': {S: _.messages.handlers.POSTPROCESSING},
    ':result': {S: result},
  })
  .then(function() {
    return DONE;
  });
}

exports.handler = main;
