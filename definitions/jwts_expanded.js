module.exports = {
  data: {
    type: 'jwts',
    id: 'jwt123',
    attributes: {
      token: 'abc.def.ghi',
    },
    relationships: {
      recorder: {
        data: {type: 'recorders', id: 'recorder123'},
      },
      account: {
        data: {type: 'accounts', id: 'account123'},
      },
    },
  },
  included: [
    {
      type: 'accounts',
      id: 'account123',
      attributes: {
        email: 'john@example.com',
        full_name: 'John Doe',
        registration_ts: '2015-10-19 09:19:55',
        is_verified: true,
      },
      relationships: {
        receivers: {
          data: [
            {type: 'recorders', id: 'recorder123'},
          ],
        },
        sent: {
          links: {
            related: 'https://api.peppermint.com/accounts/account123/relationships/sent',
            next: 'https://api.peppermint.com/accounts/account123/relationships/sent?next=message2',
          },
          data: [
            {type: 'messages', id: 'message1'},
            {type: 'messages', id: 'message2'},
          ],
        },
        received: {
          links: {
            related: 'https://api.peppermint.com/accounts/account123/relationships/received',
            next: 'https://api.peppermint.com/accounts/account123/relationships/received?next=message4',
          },
          data: [
            {type: 'messages', id: 'message3'},
            {type: 'messages', id: 'message4'},
          ],
        },
      },
    },
    {
      type: 'recorders',
      id: 'recorder123',
      attributes: {
        recorder_client_id: 'someclient123',
        recorder_key: 'abcDEF123',
        recorder_ts: '2015-10-19 09:19:55',
        description: 'Android 4.1 Nexus 5',
      },
    },
    {
      type: 'messages',
      id: 'message1',
      attributes: {
        audio_url: 'http://go.peppermint.com/abc/xyz.m4a',
        sender_email: 'john@example.com',
        recipient_email: 'ann@example.com',
        sender_name: 'John Doe',
        created: '2015-10-19 09:19:55',
        duration: 6,
        transcription: 'Hello Ann',
        read: '2015-10-19 09:22:03',
      },
    },
    {
      type: 'messages',
      id: 'message2',
      attributes: {
        audio_url: 'http://go.peppermint.com/abc/xyz.m4a',
        sender_email: 'john@example.com',
        recipient_email: 'bob@example.com',
        sender_name: 'John Doe',
        created: '2015-10-19 09:19:55',
        duration: 6,
        transcription: 'Hello Bob',
        read: '2015-10-19 09:22:03',
      },
    },
    {
      type: 'messages',
      id: 'message3',
      attributes: {
        audio_url: 'http://go.peppermint.com/abc/xyz.m4a',
        sender_email: 'bob@example.com',
        recipient_email: 'john@example.com',
        sender_name: 'Bob',
        created: '2015-10-19 09:19:55',
        duration: 6,
        transcription: 'Hello John',
        read: '2015-10-19 09:22:03',
      },
    },
    {
      type: 'messages',
      id: 'message4',
      attributes: {
        audio_url: 'http://go.peppermint.com/abc/xyz.m4a',
        sender_email: 'ann@example.com',
        recipient_email: 'john@example.com',
        sender_name: 'Ann',
        created: '2015-10-19 09:19:55',
        duration: 6,
        transcription: 'Hello John',
        read: '2015-10-19 09:22:03',
      },
    },
  ],
}
