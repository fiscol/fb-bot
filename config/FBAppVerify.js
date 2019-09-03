/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */

// Arbitrary value used to validate a webhook
const config = require('config');
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

exports._verifyToken = function(req, res){
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === 'WEBHOOK_token') {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
  
};