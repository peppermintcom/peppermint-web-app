This directory contains all the logic that should run when a new audio file has
been uploaded to S3.

Get static x86_64 linux builds for ffprobe and ffmpeg from
http://johnvansickle.com/ffmpeg/.

ffprobe is used to calculate the duration of the audio and save that to the
messages table in the database. If someone sends an inter-app message, the
message will not be delivered until the duration is available. Thus there may be
pending messages awaiting delivery after the postprocessing logic completes.
The routine ends by checking the messages table for any such pending messages
and forwarding them to GCM. To avoid race conditions, the forwarding routine
waits 10 seconds after saving the duration to the upload table, because this is
the maximum lifetime of the CreateMessage lambda function that would be
forwarding the message immediately if the duration is available.
