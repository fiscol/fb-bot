/*
 * Copyright 2016, TC Essence.
 * All rights reserved.
 *
 */

'use strict';
require('es6-promise');

const bodyParser = require('body-parser');
const config = require('config');
const crypto = require('crypto');

const express = require('express');
const https = require('https');
const request = require('request');

const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const device = require('express-device');
const cors = require('cors');
const errorLog = require('./tool/ErrorLog.js');

const app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json({ verify: verifyRequestSignature, limit: '50mb' }));
app.use(express.static('public'));

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(device.capture());

/*** Fiscol 加入cookie, allow-origin設定, 暫時作為cross domain傳值的方法***/
/*** 這段若有更好解法歡迎協助調整與討論, 感謝 ***/
app.use(expressSession({
  secret: 'Eilis from TC',
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/',
    domain: 'api.eilis-ai.com',
    maxAge: 1000 * 60 * 24 // 24 hours
  }
}));

// UncaughtException Handle, Save Error Message To DB
process.on('uncaughtException', function (err) {
  if(err.hasOwnProperty("stack")){
    errorLog._ErrorLogToDB("系統錯誤:" + err.stack);
  }
  else{
    errorLog._ErrorLogToDB("系統錯誤:" + err);
  }
})
// app.use(function(req, res, next) {
//     res.header('Access-Control-Allow-Credentials', true);
//     res.header('Access-Control-Allow-Origin', req.headers.origin);
//     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
//     // WebToken, UserID是驗證Eilis設定權限的自定義標籤
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, WebToken, UserID');
//     next();
// });

// Webhooks FBApp後台連線 設定檔
const FBAppVerify = require('./config/FBAppVerify');
// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');
// Config 設定檔 END

// Router & API

/*** Fiscol 拆解公版功能相關route程式區塊 START ***/

// 純API進入點
const FuncitionalRoute = require('./routes/functional');
app.use('/functional', FuncitionalRoute);
// 前端View進入點
const ViewRoute = require('./routes/view');
app.use('/view', ViewRoute);

/*** Fiscol 拆解公版功能相關route程式區塊 END ***/
// 粉絲訊息進入點
const webhook = require('./fb_routes/webhook');

// FB BOT(FB預設訊息互動Route會進到webhook)
app.get('/webhook', FBAppVerify._verifyToken); //Regiest to FB App
app.post('/webhook', webhook._msg); //TC BOT Controller


// Router & API END

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    // console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
      .update(buf)
      .digest('hex');

    if (signatureHash != expectedHash) {
      console.log('signatureHash ' + signatureHash);
      console.log('expectedHash ' + expectedHash);
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function () {
  console.log('Eilis Server is running on port', app.get('port'));
});

module.exports = app;

