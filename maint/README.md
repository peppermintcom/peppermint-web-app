## Garbage

### Recorders
Any recorder with a dev api_key and a recorder_ts more than a week old can be
discarded.

### Accounts
Discard all @mailinator.com accounts more than a week old.

### Messages
Discard a message if the audio is gone or recipient is gone or sender is gone.

### Receivers
Discard if the recorder or account is gone.

### Short-urls
Discard if the upload is gone.

### Transcriptions
Discard if the upload is gone.

### Uploads
Discard if the audio_url is gone and it was initialized more than an hour ago.
OR
Discard if the recorder that produced it is gone and it is more than a week old.

### Audio File on S3
Discard anything without an upload record.

1. recorders & accounts
2. uploads & receivers
3. messages, short-urls, transcriptions, S3 files

Discarding uploads should cascade discard messages, short-urls, transcriptions, and
S3 files to shorten the scans on those tables.
