# Peppermint API on AWS API Gateway

## Setup
Each app or extension that uses the API needs to register in order
to obtain an API Key. For now this is a manual process so contact Andrew Reed if
you need an API Key. For testing or development, you can use the key "abc123".
***Data associated with the development API Key will be periodically purged.***
The API Key is NOT used in the input at the top of this page with "api_key" placeholder text.

## Flow
When a user installs an app, the client will register itself as a Recorder with the
API by making a POST request to /recorder. The server will reply with a JWT
token in the "at" field of a 201 response.  The client can then initialize a
file upload by making a POST request to /uploads with the JWT token in the
Authorization header using the Bearer scheme. The server will return a
signed_url where the file can be uploaded. The client should then make a PUT
request to this signed_url. No authorization header is required here -
authentication details are contained in the querystring. The signed_url will be
for a specific key in a S3 bucket. S3 is picky about the PUT requests clients
make using signed_urls.  The contentType submitted to the Peppermint API POST
/uploads endpoint must match the Content-Type header sumitted with the PUT
request to the signed_url and no other headers besides Content-Length should be
included.

## Inter-App Flow
After initializing an upload using POST /uploads, submit a POST request to
/messages. You must be authenticated as sender_email to make a request (using an
		auth token returned either from POST /accounts or POST /jwts).
The audio_url submitted to POST /messages must be the canonical_url returned by
POST /uploads. You do not have to wait for the audio to finish uploading before
calling POST /messages. The API will wait until the audio is ready before
forwarding the message to GCM for delivery to the recipient.
