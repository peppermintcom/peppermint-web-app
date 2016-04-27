//2016-01-01 00:00:00 => new Date('2016-01-01T00:00:00');
//replacing the space with a T causes the value to be interpreted as UTC
module.exports = function(s) {
  var d = new Date(s.replace(/\s/, 'T'));

  return !!d.valueOf() ? d : null;
};
