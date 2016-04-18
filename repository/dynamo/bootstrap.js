var schema = require('./schema');
var dynamo = require('./client');

if (process.env.NODE_ENV === 'production') {
  throw new Error('this would have deleted the production database');
}

module.exports = function() {
  dynamo.deleteTable({TableName: 'recorders'}, function() {
    dynamo.createTable(schema.recorders, function(err) {
      if (err) console.log(err);
    });
  });

  dynamo.deleteTable({TableName: 'uploads'}, function() {
    dynamo.createTable(schema.uploads, function(err) {
      if (err) console.log(err);
    });
  });

  dynamo.deleteTable({TableName: 'accounts'}, function() {
    dynamo.createTable(schema.accounts, function(err) {
      if (err) console.log(err);
    });
  });

  dynamo.deleteTable({TableName: 'transcriptions'}, function() {
    dynamo.createTable(schema.transcriptions, function(err) {
      if (err) console.log(err);
    });
  });

  dynamo.deleteTable({TableName: 'messages'}, function() {
    //ignore error for table not existing
    dynamo.createTable(schema.messages, function(err) {
      if (err) console.log(err);
    });
  });
};
