var messages = {
  AttributeDefinitions: [
    {
      AttributeName: 'message_id',
      AttributeType: 'S',
    },
    {
      AttributeName: 'sender_email',
      AttributeType: 'S',
    },
    {
      AttributeName: 'recipient_email',
      AttributeType: 'S',
    },
    {
      AttributeName: 'created',
      AttributeType: 'N',
    },
    {
      AttributeName: 'audio_url',
      AttributeType: 'S',
    },
  ],
  KeySchema: [
    {
      AttributeName: 'message_id',
      KeyType: 'HASH',
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
  TableName: 'messages',
  GlobalSecondaryIndexes: [
    {
      IndexName: 'sender_email-created-index',
      KeySchema: [
        {
          AttributeName: 'sender_email',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'created',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10,
      },
    },
    {
      IndexName: 'recipient_email-created-index',
      KeySchema: [
        {
          AttributeName: 'recipient_email',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'created',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10,
      },
    },
    {
      IndexName: 'audio_url-index',
      KeySchema: [
        {
          AttributeName: 'audio_url',
          KeyType: 'HASH',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10,
      },
    },
  ]
};

module.exports = {
  messages: messages,
};
