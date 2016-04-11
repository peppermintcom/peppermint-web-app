var schema = require('./schema');
var dynamo = require('./client');

if (process.env.NODE_ENV === 'production') {
  throw new Error('this would have deleted the production database');
}

dynamo.deleteTable({TableName: 'messages'}, function() {
  //ignore error for table not existing
  dynamo.createTable(schema.messages, function(err) {
    if (err) console.log(err);
  });
});
