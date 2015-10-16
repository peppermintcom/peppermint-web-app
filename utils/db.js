var pg = require('pg');
var _ = require('lodash');
var conf = require('./conf.js');

const conn = conf.PEPPERMINT_DB;

/**
 * Run a stored procedure and get result rows.
 * @param {String} procedure - name of the function
 * @param {Array} args
 * @param {Function} [parse]
 * @param {Function} cb
 */
var exec = exports.exec = function(procedure, args, parse, cb) {
  if (arguments.length === 3) {
    cb = parse;
    parse = _.identity;
  }

  pg.connect(conn, function(err, client, done) {
    if (err) {
      cb(err);
      return;
    }
    client.query('SELECT * FROM ' + procedure + '(' + params(args) + ');', args, function(err, result) {
      done();
      if (err) {
        cb(err);
        return;
      }
      cb(null, result.rows.map(parse));
    });
  });
};

/**
 * Run a stored procedure expecting a single row result.
 * @param {String} procedure - name of the function
 * @param {Array} args
 * @param {Function} [parse]
 * @param {Function} cb
 */
var execRow = exports.execRow = function(procedure, args, parse) {
  if (arguments.length === 2) {
    cb = parse;
    parse = _.identity;
  }

  return new Promise(function(resolve, reject) {
    exec(procedure, args, parse, function(err, rows) {
      if (err) {
        reject(err);
        return;
      }
      if (rows.length !== 1) {
        reject(new Error(rows));
        return;
      }
      resolve(rows[0]);
    });
  });
};

/**
 * Run a stored procedure returning a single primitive value.
 * @param {String} procedure - name of the function
 * @param {Array} args
 * @param {Function} cb
 */
exports.execValue = function(procedure, args, cb) {
  //row will be an object with a single key of the name of the procedure
  var parse = _.partial(_.get, _, procedure);

  return execRow(procedure, args, parse, function(err, value) {
    if (err) {
      cb(err);
      return;
    }
    cb(null, value);
  });
};

/**
 * Run a stored procedure without a return value.
 * @param {String} procedure - name of the function
 * @param {Array} args
 * @param {Function} cb
 */
exports.execVoid = function(procedure, args, cb) {
  return exec(procedure, args, function(err, rows) {
    if (err) {
      cb(err);
      return;
    }
    if (rows.length !== 0) {
      cb(new Error(rows));
      return;
    }
    cb(null);
  });
};

function params(args) {
  args = args || [];

  return args
    .map(function(arg, index) {
      return '$' + (1 + index);
    })
    .join(',');
}
