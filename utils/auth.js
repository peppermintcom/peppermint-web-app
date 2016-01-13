var recorderOnly = /^peppermint recorder=[\w\+\/]+=?$/i;
var accountOnly = /^peppermint account=[\w\+\/]+=?$/i;
var recorderAccount = /^peppermint recorder=[\w\+\/]+=?, account=[\w\+\/]+=?$/i;
var accountRecorder = /^peppermint account=[\w\+\/]+=?, recorder=[\w\+\/]+=?$/i;

exports.isValid = function(authHeader) {
  if (typeof authHeader !== 'string') {
    return false;
  }

  return recorderOnly.test(authHeader) ||
    accountOnly.test(authHeader) ||
    recorderAccount.test(authHeader) ||
    accountRecorder.test(authHeader);
}
