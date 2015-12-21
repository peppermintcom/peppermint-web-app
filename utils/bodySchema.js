var _ = require('lodash');

/**
 * Each path operation includes a spec with an array of paramters. This utility
 * gets the schema for the body parameter.
 */
module.exports = function(parameters) {
  var param =  _.find(parameters, function(param) {
    return param['in'] === 'body';
  });

  return param && param.schema;
};
