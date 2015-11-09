# Peppermint API on AWS API Gateway

## Setup
Each app or extension that uses the API needs to register in order
to obtain an API Key. For now this is a manual process so contact Andrew Reed if
you need an API Key. For testing or development, you can use the key "abc123".
(This is only used in the api_key field in the request body for the POST
/recorder request. Ignore the input at the top of this page with "api_key"
placeholder text).

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
included. After the client completes the upload, it should submit a POST request
to /record to get the canonical_url where the file can be read by the public.
The clients can then share this url in an email or text message, or download the
file and send it as an attachment in an email.
