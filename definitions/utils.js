exports.resourceObjectSchema = function(type, attributesSchema) {
  return {
    type: 'object',
    properties: {
      type: {type: 'string', pattern: '^' + type + '$'},
      id: {type: 'string'},
      attributes: attributesSchema,
    },
    required: ['type', 'id', 'attributes'],
  };
};
