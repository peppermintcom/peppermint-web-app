var recorders = {
  AttributeDefinitions: [
    {
      AttributeName: 'client_id',
      AttributeType: 'S',
    },
    {
      AttributeName: 'recorder_id',
      AttributeType: 'S',
    },
  ],
  KeySchema: [
    {
      AttributeName: 'client_id',
      KeyType: 'HASH',
    },
  ],
  TableName: 'recorders',
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
  GlobalSecondaryIndexes: [
    {
      IndexName: 'recorder_id-index',
      KeySchema: [
        {
          AttributeName: 'recorder_id',
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
  ],
};
 
var receivers = {
  AttributeDefinitions: [{
    AttributeName: 'recorder_id',
    AttributeType: 'S',
  }, {
    AttributeName: 'account_id',
    AttributeType: 'S',
  }],
  KeySchema: [{
    AttributeName: 'recorder_id',
    KeyType: 'HASH',
  }, {
    AttributeName: 'account_id',
    KeyType: 'RANGE',
  }],
  TableName: 'receivers',
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
  GlobalSecondaryIndexes: [{
    IndexName: 'recorder_id-index',
    KeySchema: [{
      AttributeName: 'recorder_id',
      KeyType: 'HASH',
    }],
    Projection: { ProjectionType: 'ALL' },
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10,
    },
  }, {
    IndexName: 'account_id-index',
    KeySchema: [{
      AttributeName: 'account_id',
      KeyType: 'HASH',
    }],
    Projection: { ProjectionType: 'ALL' },
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10,
    },
  }],
};

var uploads = {
  AttributeDefinitions: [
    {
      AttributeName: 'pathname',
      AttributeType: 'S',
    },
  ],
  KeySchema: [
    {
      AttributeName: 'pathname',
      KeyType: 'HASH',
    },
  ],
  TableName: 'uploads',
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

var accounts = {
  TableName: 'accounts',
  AttributeDefinitions: [{
    AttributeName: 'email',
    AttributeType: 'S',
  }, {
    AttributeName: 'account_id',
    AttributeType: 'S',
  }],
  KeySchema: [{
    AttributeName: 'email',
    KeyType: 'HASH',
  }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
  GlobalSecondaryIndexes: [{
    IndexName: 'account_id-index',
    KeySchema: [{
      AttributeName: 'account_id',
      KeyType: 'HASH',
    }],
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10,
    },
    Projection: {
      ProjectionType: 'ALL',
    },
  }],
};

var transcriptions = {
  TableName: 'transcriptions',
  AttributeDefinitions: [{
    AttributeName: 'transcription_id',
    AttributeType: 'S',
  }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
  KeySchema: [{
    AttributeName: 'transcription_id',
    KeyType: 'HASH',
  }],
};

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
  recorders: recorders,
  receivers: receivers,
  uploads: uploads,
  accounts: accounts,
  transcriptions: transcriptions,
  messages: messages,
};
