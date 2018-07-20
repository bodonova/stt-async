const express = require('express');
const crypto = require('crypto');
const bp = require("body-parser");
var jsonParser = bp.json()
const app = express();
const port = process.env.PORT || 3000;

// var secret_key = null
var secret_key = 'my_secret_key';

// record details of the request in the log (for debugging purposes)
function log_request (request) {
  console.log('verb='+request.method);;
  console.log('url='+ request.originalUrl);
  console.log("Query: "+JSON.stringify(request.query));
  console.log("Body: "+JSON.stringify(request.body));
  console.log("Headers: "+JSON.stringify(request.headers));
}

// check if the signature is valid
function check_signature(request, in_text) {

  // check the request has a signature if we are configured to expect one
  if (secret_key) {
    var this_signature = request.get('x-callback-signature');
    if (!this_signature) {
      console.log("No signature provided despite the fact that this server expects one");
      throw new Error("No signature provided despite the fact that this server expects one");
    } else {
      console.log("Signature: "+this_signature);
    }

    // Calculate what we thing the signature should be to make sure it matches
    var hmac = crypto.createHmac('sha1', secret_key);
    hmac.update(in_text);
    hmac.end();
    var hout = hmac.read();
    var expected_signature = hout.toString('base64');
    console.log("Expected signature: "+expected_signature);

    if (this_signature != expected_signature) {
      err_str = "Actual signature \""+this_signature+"\" does not match what we expected \""+expected_signature+"\"";
      console.log(err_str);
      throw new Error(err_str);
    }
  } 
}

// A simple home page for people who stumble across this site
app.get('/', (request, response) => {
  response.send('Welcome to Watson STT dummy callback processor read <a href=\"http://brianodonovan.ie\">my blog post</a> to understand how to use it');
  log_request (request);
})

// Handle POST requests with STT job status notification
app.post('/results', jsonParser, (request, response) => {
  log_request (request);
  if (!request.body) {
    var err_text = 'Invalid POST request with no body';
    console.log(err_text);
    response.status(400);
    response.status(err_text);
  }
  check_signature(request, JSON.stringify(request.body));

  // for now just record the event in the log
  console.log('Event id:'+request.body.id+' event:'+request.body.event+' user_token:'+request.body.id);

  // The spec is not clear about what we should respond to just say OK
  response.type('text/plain');
  response.send("OK");
})

// Deal with the initial request checking if this is a valid STT callback URL
app.get('/results', (request, response) => {
  log_request (request);

  if (!request.query.challenge_string) {
    console.log("No challenge_string specified in GET request");
    throw new Error("No challenge_string specified in GET request");
  }

  check_signature(request, request.query.challenge_string);
 
  response.type('text/plain');
  response.send(request.query.challenge_string);
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log(`server is listening on ${port}`);
})
