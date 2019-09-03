// Eilis公版粉專訊息路徑
const EilisUserPageReceivedMessage = require('./service/eilis_message_process');

const db = require('../db/firebase_db.js');
const errorLog = require('../tool/ErrorLog.js');
const commentReplyModel = require('./model/comment_reply_model.js');

exports._msg = function (req, res) {
  try {
    var data = req.body;
    var pageToken, pageName;
    if (data.object == 'page') {
      data.entry.forEach(function (pageEntry) {
        var pageID = pageEntry.id;
        console.log('pageEntry:' + JSON.stringify(pageEntry));
        // 粉專Messenger私訊的進入點
        if (pageEntry.hasOwnProperty("messaging")) {
          // Iterate over each messaging event
          pageEntry.messaging.forEach(function (messagingEvent) {
            // 點擊藍色選單按鈕，卡片內非連結類按鈕，一般留言互動 
            if (messagingEvent.message) {
              db._onValuePromise('EilisFB', pageID + '/PageBasicData').then(function (val) {
                if (val && val != null) {
                  pageToken = val.PageToken;
                  pageName = val.PageName;
                  console.log('粉絲進入Eilis received, PageToken: ' + pageToken + ' pageID: ' + pageID + 'pageName: ' + pageName)
                  EilisUserPageReceivedMessage._received(messagingEvent, pageToken, pageID, pageName);
                  return Promise.resolve("訊息處理完成");
                }
              });
            }
            // 點擊左下角主選單按鈕，開始使用等固定類型按鈕 
            else if (messagingEvent.postback) {
              db._onValuePromise('EilisFB', pageID).then(function (pageData) {
                if (pageData != null) {
                  pageToken = pageData.PageBasicData.PageToken;
                  pageName = pageData.PageBasicData.PageName;
                  console.log('粉絲進入Eilis postback, PageToken: ' + pageToken + ' pageID: ' + pageID + 'pageName: ' + pageName);
                  EilisUserPageReceivedMessage._EilisPostBack(pageData, messagingEvent, pageToken)
                  return Promise.resolve("固定按鈕處理完成");
                }
              });
            } else if (messagingEvent.delivery) {
              //receivedDeliveryConfirmation(messagingEvent);
            } else if (messagingEvent.optin) {
              //receivedAuthentication(messagingEvent);
            }
            // 粉絲已讀訊息 
            else if (messagingEvent.read) {

            } else {
              console.log("Webhook received other messagingEvent: ", messagingEvent);
            }
          });
        }
        // 粉專頁面按讚或留言的訊息進入點
        else if (pageEntry.hasOwnProperty("changes")) {
          // 針對PO文留言的處理
          if (pageEntry.changes[0]["value"].hasOwnProperty("comment_id")) {
            var CommentID = pageEntry.changes[0]["value"]["comment_id"];
            var Message = pageEntry.changes[0]["value"]["message"];
            var PageID = pageEntry.id;
            var PostID = pageEntry.changes[0]["value"]["post_id"];
            var UserID = pageEntry.changes[0]["value"]["sender_id"].toString();
            var UserName = pageEntry.changes[0]["value"]["sender_name"];
            var Action = pageEntry.changes[0]["value"]["verb"];
            if (Action == "add" && PageID.toString() != UserID && Message != undefined) {
              console.log("粉絲" + UserName + "對粉專" + PageID + "PO文互動");
              var CommentReply = new commentReplyModel(PageID, PostID, CommentID, Message, UserID, UserName);
              // 留言模組回覆
              CommentReply.keywordsReply(CommentReply.PageID, CommentReply.PostID, CommentReply.CommentID, CommentReply.Message, CommentReply.UserID, CommentReply.UserName);
              // API設定留言回覆
              CommentReply.APIkeywordsReply(CommentReply.PageID, CommentReply.PostID, CommentReply.CommentID, CommentReply.Message);
            }
          }
        }
        else {
          console.log("Other Webhook Event.");
        }
      });

      // Assume all went well.
      //
      // You must send back a 200, within 20 seconds, to let us know you've 
      // successfully received the callback. Otherwise, the request will time out.
      res.sendStatus(200);
    }
  }
  catch (err) {
    console.error('Webhook error, 原因:' + err);
    res.sendStatus(200);
  }
};






/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}



/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function (messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}

//日期格式轉DB日期字串(_DateType可傳入"DateTime"或"Date")
var _dateToDBString = function (_Input, _DateType) {
  // Time Log Test
  var dd = _Input.getDate();
  var mm = _Input.getMonth() + 1; //January is 0!
  var yyyy = _Input.getFullYear();
  var h = _Input.getHours();
  var m = _Input.getMinutes();
  var s = _Input.getSeconds();
  if (dd < 10) {
    dd = '0' + dd
  }

  if (mm < 10) {
    mm = '0' + mm
  }

  if (h < 10) {
    h = '0' + h
  }
  if (m < 10) {
    m = '0' + m
  }
  if (s < 10) {
    s = '0' + s
  }
  var DateString;
  if (_DateType == "DateTime") {
    DateString = yyyy + '/' + mm + '/' + dd + " " + h + ":" + m + ":" + s;
  }
  if (_DateType == "Date") {
    DateString = yyyy + '/' + mm + '/' + dd;
  }
  return DateString;
}


