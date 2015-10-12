exports.handler = function(event, context) {
  //stub
  context.succeed({
    at: 'abc.def.ghi',
    recorder: {
      recorder_id: 1234567890,
      user_account_id: 2345678901,
      recorder_client_id: 'some 123 client',
      recorder_key: 'abcDEF123',
      recorder_ts: '2015-10-19 09:19:55',
      description: 'Android 4.1 Nexus 5',
    },
  });
};
