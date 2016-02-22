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

exports.resourceCollectionSchema = function(type, attributesSchema) {
  return {
    type: 'array',
    items: obj(type, attributesSchema),
  };
};

exports.adapt = function(attrSchema, permitted, required) {
  var props = _.pick(attrSchema.properties, permitted.concat(required));

  return {
    type: 'object',
    properties: props,
    required: required,
    additionalProperties: !!attrSchema.additionalProperties,
  };
};
