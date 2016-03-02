var _ = require('lodash');

var obj = exports.resourceObjectSchema = function(type, attributesSchema) {
  return {
    type: 'object',
    properties: {
      type: {type: 'string', pattern: '^' + type + '$'},
      id: {type: 'string'},
      attributes: attributesSchema,
      relationships: {
        type: 'object',
        properties: {},
        additionalProperties: true,
      },
    },
    required: ['type', 'id', 'attributes'],
    additionalProperties: false,
  };
};

exports.resourceCollectionSchema = function(resourceSchema) {
  return {
    type: 'array',
    items: resourceSchema,
  };
};

exports.adapt = function(schema, permitted, required) {
  var props = _.pick(schema.properties, permitted.concat(required));

  return {
    type: 'object',
    properties: props,
    required: required,
    additionalProperties: !!schema.additionalProperties,
  };
};

exports.jsonapi = function(data, links) {
  var props = {data: data};

  if (links) {
    props.links = links;
  }

  return {
    type: 'object',
    properties: props,
    required: ['data'],
  };
};

exports.linksSchema = {
  type: 'object',
  properties: {
    next: {type: 'string'},
  },
  additionalProperties: false,
};

module.exports = _.assign(_, exports);
