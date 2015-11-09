//array of lambda handlers and swagger doc locations
var fs = require('fs');
var path = require('path');
var _ = require('utils');

var base = path.join(__dirname, '../resources');

var methods = {
  get: true,
  post: true,
  put: true,
  delete: true,
};

var paths = [];
var handlers = [];

function collectPaths(dir) {
  var hasMethod = false;

  fs.readdirSync(dir).forEach(function(f) {
    if (methods[f]) {
      handlers.push(path.join(dir, f));
      hasMethod = true;
      return;
    }
    collectPaths(path.join(dir, f));
  });

  if (hasMethod) {
    paths.push(dir);
  }
}

collectPaths(base);

exports.paths = paths.map(function(p) {
  return '/' + path.relative(base, p);
});

exports.handlers = handlers.map(function(p) {
  return path.join(p, 'index.js');
});
