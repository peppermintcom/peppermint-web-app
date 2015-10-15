# peppermint-api

## Build
```
npm install
```
Create a local postgres database and save the connection string in the
PEPPERMINTDB env var.
```
export PEPPERMINTDB=postgres://areed:@localhost/peppermint
```
Define tables, views, and functions in your database.
```
cd sql
psql -f build.sql peppermint
```

## Docs
```
npm serve
```
Then open http://localhost:3000/docs/?url=/swagger.json in your browser.

## Deploy
The swagger build task generates a swagger.json from the code. The
aws-apigateway-swagger-importer submodule provides a script to generate an API
from a swagger.json file.
Before using the import tool, ensure the submodule was cloned (hint: ```git clone
--recursive```), install maven on your system, and build the tool with ```mvn
assembly:assembly```. To create the API the first time, run:
```
cd build/aws-apigateway-swagger-importer
./aws-api-import.sh --create ../../swagger.json
```
Watch the output for the api id. Log into the AWS console and deploy the API and
note the stage. Then the API can be updated with
```
./aws-api-import.sh --update API_ID --deploy STAGE ../../swagger.json
```

## Tests
Unit tests are in the subdirectory of the file they're testing. Run them with
```npm test```. Integration tests are all in the test directory. Run them with
```npm run tests```.
