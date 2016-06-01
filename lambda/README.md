These routines perform the minimum work required to run the app procedures in the Lambda programming environment behind AWS API Gateway.

Postprocess is triggered by upload events and calculated the duration of the
audio with ffprobe.
Get static x86_64 linux builds for ffprobe from
http://johnvansickle.com/ffmpeg/ and include it in the zip uploaded to lambda.
