const DBQuery = require("../../tool/DBQuery");
const db = require('../../db/firebase_db.js');
const TimeNow = require('../../tool/TimeNow');
const errorLog = require('../../tool/ErrorLog.js');
const request = require('request');
require('es6-promise');


// SenderData相關Model
const PageSenderModel = require('../model/page_sender_model');
// Eilis公版功能Model
const EilisFunctionModel = require('../model/eilis_function_model');


// Eilis公版用戶粉絲訊息
exports._received = function (event, pageToken, pageID, pageName) {
  try {
    // 解析 event訊息 參數
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var message = event.message;
    var messageText = message.text;
    var isEcho = message.is_echo;
    var messageId = message.mid;
    // 若為粉絲發送訊息
    if (pageID === recipientID) {
      DBQuery._EilisUserPage(pageID).then(function (pageContent) {
        if (pageContent && pageContent != null) {
          // Sender 粉絲 第一次與粉絲頁對話，撈基本資料並儲存。
          PageSenderModel.SaveNewPageSenderBasicData(senderID, pageID, pageToken);
          // 儲存Sender所有對話 
          PageSenderModel.SavePageSenderConversationRecord(messageText, senderID, pageID, pageToken);
          // 下班時間回覆目前無真人客服的提示訊息
          if (pageContent.hasOwnProperty("OfficeSetting")) {
            EilisFunctionModel.SendOffDutyMessage(messageText, pageContent, senderID, pageToken);
          }
          // 通知真人客服
          if (pageContent.hasOwnProperty("CustomerService")) {
            EilisFunctionModel.InformAdmin(messageText, pageContent, senderID, pageToken);
          }
          // 若有傳入特定符號的留言，視為加入標籤
          if (messageText.indexOf("**") == 0) {
            EilisFunctionModel.CreateTag(messageText, pageContent, senderID, pageToken);
          }
          // 公版Eilis QA腳本Model(留言有對應QA就跟上文字回覆 + 藍色選單)
          if (pageContent.EilisQASetting != null) {
            EilisFunctionModel.EilisQAScriptAutoReply(messageText, pageContent, senderID, pageToken);
          }
          // Blue主選單Model
          // 留言有對應WorkFlow就跟上卡片 + 藍色選單
          if (pageContent.hasOwnProperty("EilisUI") && pageContent.EilisUI.hasOwnProperty("Payload") && pageContent.EilisUI.hasOwnProperty("WorkFlow")) {
            EilisFunctionModel.SendPayload(messageText, pageContent, senderID, pageToken);
          }
          // API關鍵字卡片對接
          if (pageContent.hasOwnProperty("EilisAPICard") && pageContent.EilisAPICard.hasOwnProperty("Status") && pageContent.EilisAPICard.Status.toLowerCase() == "on") {
            EilisFunctionModel.SendAPICard(messageText, pageContent, senderID, pageToken);
          }
          return Promise.resolve("Eilis 公版使用者粉絲");
        }
      })
    }
  }
  catch (err) {
    errorLog._ErrorLogToDB(err);
    return Promise.reject(err);
  }
}



// Eilis公版用戶粉絲PostBack訊息
// (固定按鈕類會觸發，例如左下方的主選單 以及 開始使用)

exports._EilisPostBack = function (pageContent, event, pageToken) {
  try {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var payload = event.postback.payload;
    console.log(JSON.stringify(event));

    switch (payload) {
      case "公版主選單":
        if (pageContent && pageContent != null) {
          // Sender 粉絲 第一次與粉絲頁對話，撈基本資料並儲存。
          PageSenderModel.SaveNewPageSenderBasicData(senderID, recipientID, pageToken);
        }
        break;
      case "開始使用":
        // Sender 粉絲 第一次與粉絲頁對話，撈基本資料並儲存。
        PageSenderModel.SaveNewPageSenderBasicData(senderID, recipientID, pageToken);
        // 回復歡迎詞，跟上選單
        if (pageContent.EilisWelcomeData != null) {
          EilisFunctionModel.EilisWelcomeAutoReply(pageContent, senderID, pageToken);
        }
        break;
    }
    // 加入讀取固定選單對應Payload
    // 新版EilisUI架構(按鈕有對應WorkFlow就跟上卡片 + 藍色選單)
    if (pageContent.hasOwnProperty("EilisUI") && pageContent.EilisUI.hasOwnProperty("Payload") && pageContent.EilisUI.hasOwnProperty("WorkFlow")) {
      EilisFunctionModel.SendPayload(payload, pageContent, senderID, pageToken);
    }
    // 通知真人客服
    if (pageContent.hasOwnProperty("CustomerService")) {
      EilisFunctionModel.InformAdmin(payload, pageContent, senderID, pageToken);
    }
    // 若有傳入特定符號的留言，視為加入標籤
    if (payload.indexOf("**") == 0) {
      EilisFunctionModel.CreateTag(payload, pageContent, senderID, pageToken);
    }
    return Promise.resolve("Eilis 公版使用者粉絲");
  }
  catch (err) {
    errorLog._ErrorLogToDB(err);
    return Promise.reject(err);
  }
}


/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
// 將已讀訊息粉絲加入廣播清單
exports._read = function (event, pageID, pageName) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
  console.log("已讀 and senderID: " + senderID)

}
