var _ = require('lodash');

exports.accounts = require('./accounts');
exports.jwts = require('./jwts');
exports.messages = require('./messages');
exports.recorders = require('./recorders');


//http://jsonapi.org/format/#document-resource-identifier-objects
var resourceIdentifierObjectSchema = exports.resourceIdentifierObjectSchema = {
  type: 'object',
  properties: {
    type: {type: 'string'},
    id: {type: 'string'},
  },
  required: ['type', 'id'],
};

var resourceObjectSchema = {
  type: 'object',
  properties: {
    type: {type: 'string'},
    id: {type: 'string'},
    attributes: {type: 'object'},
  },
  required: ['type', 'id', 'attributes'],
};

exports.includedSchema = {
  type: 'array',
  items: resourceObjectSchema,
};

exports.withRelationships = function(resourceObject) {
  var relationships = _.tail(arguments);
  var relationshipsSchema = {
      type: 'object',
      properties: relationships.reduce(function(o, r) {
        o[r] = {
          type: 'object',
          properties: {
            data: resourceIdentifierObjectSchema,
          },
        };
        return o;
      }, {}),
      additionalProperties: false,
  };
  var rsrc = _.cloneDeep(resourceObject);

  rsrc.properties.relationships = relationshipsSchema;

  return rsrc;
};
