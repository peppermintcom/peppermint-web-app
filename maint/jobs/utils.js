var _ = require('../utils');

function filename(tablename, start) {
  return function(type) {
    return [type, tablename, start + '.txt'].join('-')
  };
}

function filenames(tablename) {
  var start = _.timestamp().replace(' ', 'T').replace(':', '');
  var namer = filename(tablename, start.substring(0, start.indexOf(':')));

  return {
    inconsistent: namer('inconsistent'),
    garbage: namer('garbage'),
    sound: namer('sound'),
  };
}

exports.filenames = filenames;

module.exports = _.assign({}, _, exports);
