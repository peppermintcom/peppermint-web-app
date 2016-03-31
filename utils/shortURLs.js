exports.parse = function(shortItem) {
  return {
    key: shortItem.key.S,
    pathname: shortItem.pathname.S,
    created: +shortItem.created.N,
  };
};

exports.csv = {
  encode: function(parsedShort) {
    return [parsedShort.key, parsedShort.pathname, parsedShort.created].join(',');
  },
  decode: function(row) {
    var parts = row.split(',');

    return {
      key: parts[0],
      pathname: [1],
      created: +parts[2],
    };
  },
};

exports.isConsistent = function(shortItem) {
  return shortItem.key.S && shortItem.pathname && shortItem.pathname.S && shortItem.created && shortItem.created.N && (_.keys(shortItem).length === 3);
};
