var _ = require('utils');

module.exports = function(model, permitted, required) {
  return _.assign({}, model, {
    properties: _.pick(model.properties, permitted.concat(required)),
  }, required ? {required: required} : {});
};
