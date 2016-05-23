var bcrypt = require('bcryptjs');

const BCRYPT_COST = 9

/**
 * @param {String} plaintext
 */
exports.hash = function(plaintext) {
  return new Promise(function(resolve, reject) {
    bcrypt.hash(plaintext, BCRYPT_COST, function(err, hash) {
      if (err) {
        reject(err);
        return;
      }
      resolve(hash);
    });
  });
};
exports.check = function(plain, hash) {
  return new Promise(function(resolve, reject) {
    bcrypt.compare(plain, hash, function(err, ok) {
      if (err) {
        reject(err);
        return;
      }
      resolve(ok);
    });
  });
};
