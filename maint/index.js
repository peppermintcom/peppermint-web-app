var recorders = require('./recorders');
var accounts = require('./accounts');
var receivers = require('./receivers');
var uploads = require('./uploads');
var _ = require('./utils');

//recorders.clean('abc123');
//accounts.clean();
//receivers.clean();

function id(recorder) {
  console.log(recorder);
  return recorder.recorder_id.S;
}
