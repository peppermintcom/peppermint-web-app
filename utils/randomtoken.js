var randomstring = require('randomstring');

//generate random tokens
module.exports = function(length) {
  return randomstring.generate({
    length: length || 32,
    charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
  });
};
