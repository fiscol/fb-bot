// UserData 這隻Model 負責處理Eilis個人用戶相關資料

const request = require('request');
const requestPromise = require('request-promise');
const db = require('../../db/firebase_db.js');
const payloadModel = require('./payload_model.js');
const errorLog = require('../../tool/ErrorLog.js');
const Q = require('q');

module.exports = {
  // 點擊開始使用後的問候語
  EilisWelcomeAutoReply: function (content, recipientId, pageToken) {
    try {
      // 選擇藍色選單選項
      if (content.hasOwnProperty("EilisUI") && content.EilisUI.hasOwnProperty("Menu")) {
        var Title = content.EilisWelcomeData.WelcomeText || "歡迎，底下的藍色按鈕可能有您需要的服務喔!";
        var payloadData = {
          recipient: {
            id: recipientId
          },
          message: {
            text: Title,
            metadata: "DEVELOPER_DEFINED_METADATA"
          }
        }
        payloadData.message["quick_replies"] = content.EilisUI.Menu["公版主選單"].content.quick_replies;
        callSendAPI(payloadData, pageToken);
        // 171222新增 Eilis粉專開始使用加入自動回應圖片
        if (content.PageBasicData.PageID == "948751308600303") {
          this.SendPayload("開始使用歡迎詞", content, recipientId, pageToken);
        }
      }
      else {
        var Title = content.EilisWelcomeData.WelcomeText || "歡迎，底下的藍色按鈕可能有您需要的服務喔!";
        var payloadData = {
          recipient: {
            id: recipientId
          },
          message: {
            text: Title,
            metadata: "DEVELOPER_DEFINED_METADATA"
          }
        }
        callSendAPI(payloadData, pageToken);
      }
    }
    catch (error) {
      console.trace(error);
    }
  },
  // 搜尋EilisQA腳本問答，若有預設回答回傳答覆
  EilisQAScriptAutoReply: function (messageText, pageContent, senderID, pageToken) {
    var QAList = pageContent.EilisQASetting.QAScript;
    // console.log('Eilis 自動客服 QAList:' + JSON.stringify(QAList));
    for (var i = 0; i < Object.keys(QAList).length; i++) {
      if (messageText.indexOf(QAList[i].SenderAsk) != -1) {
        var QAReply = QAList[i].PageReply;
        sendTextMessage(senderID, QAReply, pageToken);
        console.log('QA成功觸發');
        if (pageContent.hasOwnProperty("EilisUI")) {
          if (pageContent.EilisUI.hasOwnProperty("WorkFlow")) {
            Object.keys(pageContent.EilisUI.WorkFlow).forEach(function (_Key) {
              if (messageText == _Key.CardName) {
                return;
              }
            })
          }
          setTimeout(function () {
            EilisBlueMenu(pageContent, senderID, pageToken);
          }, 3000);
        }
        return;
      }
    }
    return false
  },
  // 根據Menu傳送選單，Workflow傳送卡片
  SendPayload: function (messageText, pageContent, senderID, pageToken) {
    var PageID = pageContent.PageBasicData.PageID;
    messageText = _fullWidthToHalfWidth(messageText);
    var MenuArr = [];
    // 新版Menu的版本
    // 留言內容包含
    // 1.藍色選單Menu的名稱, 觸發雙層/預設藍色選單(公版主選單)
    // 2.Workflow設定的關鍵字, 即觸發對應卡片回覆
    if (pageContent.EilisUI.hasOwnProperty("Menu")) {
      Object.keys(pageContent.EilisUI.Menu).forEach(function (_MenuName) {
        // if (messageText.indexOf(_MenuName) != -1) {
        if (messageText == _fullWidthToHalfWidth(_MenuName) || messageText.toLowerCase() == _fullWidthToHalfWidth(_MenuName).toLowerCase()) {
          MenuArr.push(_MenuName);
        }
        // else if (messageText.indexOf("主選單") != -1) {
        else if (messageText == "主選單" || messageText == "公版主選單") {
          MenuArr.push("公版主選單");
        }
      })
    }
    if (MenuArr.length != 0) {
      // 藍色選單(公版主選單) or 雙層選單
      var Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Menu[MenuArr[0]], null, null);
      callSendAPI(Payload.Data, pageToken);
    }
    // *** 待調整: 170720上線技術債 - 潛立方正式粉專關鍵字DV回傳藍色選單 Fiscol
    else if (messageText.toLowerCase() == 'dv' && (PageID == "711383062236054" || PageID == "1844635109197853")) {
      var Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Menu["公版主選單"], null, null);
      callSendAPI(Payload.Data, pageToken);
    }
    // *** 待調整: 上線技術債 - MO-BO測試粉專關鍵字mb回傳藍色選單 Fiscol
    else if (messageText.toLowerCase() == 'mb' && PageID == "128480011210879") {
      var Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Menu["公版主選單"], null, null);
      callSendAPI(Payload.Data, pageToken);
    }
    // *** 待調整: 上線技術債 - 大苑子測試粉專關鍵字dayungs回傳藍色選單 Fiscol
    else if (messageText.toLowerCase() == 'dayungs' && (PageID == "380252549076806" || PageID == "198222936006")) {
      var Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Menu["公版主選單"], null, null);
      callSendAPI(Payload.Data, pageToken);
    }
    else if (messageText.toLowerCase() == 'mt' && (PageID == "296333300885287" || PageID == "248412555570523")) {
      var Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Menu["公版主選單"], null, null);
      callSendAPI(Payload.Data, pageToken);
    }
    // 觸發WorkFlow卡片
    else if (messageText != '開始使用' && pageContent.EilisUI.hasOwnProperty("WorkFlow")) {
      var PayloadArr = [];
      var WorkflowArr = [];
      // 新版WorkFlow的版本
      // 留言內容包含Workflow設定的關鍵字, 即觸發對應卡片回覆
      Object.keys(pageContent.EilisUI.WorkFlow).forEach(function (_WorkflowID) {
        var CardName = pageContent.EilisUI.WorkFlow[_WorkflowID]["CardName"];
        if (messageText == CardName || messageText.toLowerCase() == _fullWidthToHalfWidth(CardName).toLowerCase()) {
          // 暫時關掉"包含"Workflow關鍵字的設定
          // if (messageText.indexOf(_WorkflowName) != -1) {
          pageContent.EilisUI.WorkFlow[_WorkflowID]["Cards"].map(function (_PayloadID) {
            PayloadArr.push(_PayloadID);
            WorkflowArr.push(_WorkflowID);
          })
        }
      })
      // 單張卡片(包含橫向輸出的BoxCard)
      if (PayloadArr.length == 1) {
        var Payload;
        // 卡片收到後跳出下方選單
        if (messageText != '主選單' && pageContent.EilisUI.hasOwnProperty("Menu")) {
          // 回傳Reply的藍色選單
          if (pageContent.EilisUI.WorkFlow[WorkflowArr[0]]["Reply"]) {
            var ReplyMenu = HalfWidthToFullWidth(pageContent.EilisUI.WorkFlow[WorkflowArr[0]]["Reply"]);
            Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[0]], pageContent.EilisUI.Menu[ReplyMenu].content.quick_replies, PayloadArr[0]);
          }
          // 市府測試粉專, 正式粉專特殊判斷
          else if (PageID == "136887416965426" || PageID == "153819538009272") {
            // 社會住宅隨機取兩張中一張卡片
            if (messageText == "社會住宅") {
              var RandomNumber = Math.random();
              if (RandomNumber < 0.5) {
                Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload["-KxlksMBohXrIOwhKDx6"], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, "-KxlksMBohXrIOwhKDx6");
              }
              else {
                Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload["-Kxll6ei4UQfeLNfA8GS"], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, "-Kxll6ei4UQfeLNfA8GS");
              }
            }
            // 花博隨機取三張中一張卡片
            else if (messageText == "花博") {
              var RandomNumber = Math.random();
              if (RandomNumber < 0.33) {
                Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload["-Kxlm95cb0W8oiAz-Aw4"], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, "-Kxlm95cb0W8oiAz-Aw4");
              }
              else if (RandomNumber < 0.66) {
                Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload["-KxlmLfPrA5BsLTZZrrZ"], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, "-KxlmLfPrA5BsLTZZrrZ");
              }
              else {
                Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload["-KxlmPq4mJFGGyJn6j0s"], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, "-KxlmPq4mJFGGyJn6j0s");
              }
            }
            // 其他單張卡片正常觸發
            else {
              Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[0]], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, PayloadArr[0]);
            }
          }
          // 沒有設定Reply, 預設回傳主選單
          else {
            Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[0]], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, PayloadArr[0]);
          }
        }
        // 沒有設定主選單, 只回傳卡片
        else {
          Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[0]], null, PayloadArr[0]);
        }
        callSendAPI(Payload.Data, pageToken);
      }
      // 多張卡片(縱向輸出卡片)
      else if (PayloadArr.length > 1) {
        var PromiseArr = [];
        for (var i = 0; i < PayloadArr.length; i++) {
          // 新版卡片輸出(根據Period間隔, 照順序讀取Cards, 最後一張卡片跟著輸出Reply)
          var Period = Number(pageContent.EilisUI.WorkFlow[WorkflowArr[i]]["Period"]) * 1000 || 2 * 1000;
          var Payload;
          // PayloadArr還有卡片, 只回傳卡片
          if (i != PayloadArr.length - 1) {
            Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[i]], null, PayloadArr[i]);
          }
          // PayloadArr卡片發送完畢
          else {
            if (messageText != '主選單' && pageContent.EilisUI.hasOwnProperty("Menu")) {
              // 卡片收到後跳出下方Reply選單
              if (pageContent.EilisUI.WorkFlow[WorkflowArr[i]]["Reply"]) {
                var ReplyMenu = HalfWidthToFullWidth(pageContent.EilisUI.WorkFlow[WorkflowArr[i]]["Reply"]);
                Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[i]], pageContent.EilisUI.Menu[ReplyMenu].content.quick_replies, PayloadArr[i]);
              }
              // 沒有設定Reply, 預設回傳主選單
              else {
                Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[i]], pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, PayloadArr[i]);
              }
            }
            // 沒有設定主選單, 只回傳卡片
            else {
              Payload = new payloadModel(PageID, senderID, pageContent.EilisUI.Payload[PayloadArr[i]], null, PayloadArr[i]);
            }
          }
          PromiseArr.push(callPromiseSendAPI(Payload.Data, pageToken, Period * i));
        }
        Q.all(PromiseArr);
      }
    }
  },
  // API關鍵字卡片對接
  SendAPICard: function (messageText, pageContent, senderID, pageToken) {
    //取得客戶對接的URL
    if (pageContent.EilisAPICard.hasOwnProperty("Url") && pageContent.EilisAPICard.hasOwnProperty("Keywords")) {
      //檢查留言是否出現關鍵字
      var Keywords = pageContent.EilisAPICard.Keywords;
      Keywords.map(function (_Keyword, _Index) {
        //將關鍵字加入Request對接URL呼叫
        if (_fullWidthToHalfWidth(messageText).toLowerCase().indexOf(_fullWidthToHalfWidth(_Keyword).toLowerCase()) != -1) {
          var Url = pageContent.EilisAPICard.Url;
          CardSettingRequest(_Keyword, Url).then(function (_ResponseData) {
            //檢查回傳卡片格式
            if (_ResponseData.hasOwnProperty("Type") && _ResponseData.hasOwnProperty("Content")) {
              var PageID = pageContent.PageBasicData.PageID;
              _ResponseData.PageID = PageID;
              _ResponseData.SaveToDB = false;
              //組好回傳卡片
              SetPayloadCard(_ResponseData).then(function (_CardData) {
                var Payload;
                if (pageContent.hasOwnProperty("EilisUI") && pageContent.EilisUI.hasOwnProperty("Menu")) {
                  Payload = new payloadModel(PageID, senderID, _CardData, pageContent.EilisUI.Menu["公版主選單"].content.quick_replies, null);
                }
                else {
                  Payload = new payloadModel(PageID, senderID, _CardData, null, null);
                }
                //傳送給用戶
                callSendAPI(Payload.Data, pageToken);
              }).catch(function (err) {
                errorLog._ErrorLogToDB(err);
              });
            }
          }).catch(function (err) {
            errorLog._ErrorLogToDB(err);
          });
        }
      })
    }
  },
  // 在下班時間後，通知用戶可以留言(果物配功能)
  SendOffDutyMessage: function (messageText, pageContent, senderID, pageToken) {
    if (pageContent.OfficeSetting.hasOwnProperty("OffDutyMessage") && pageContent.OfficeSetting.OutOfService == true) {
      var PayloadArr = [];
      // 新版WorkFlow的版本

      if (pageContent.EilisUI.hasOwnProperty("WorkFlow")) {
        Object.keys(pageContent.EilisUI.WorkFlow).forEach(function (_Key) {
          if (messageText == pageContent.EilisUI.WorkFlow[_Key]["CardName"]) {
            PayloadArr = pageContent.EilisUI.WorkFlow[_Key]["Cards"];
          }
        })
      }
      var DateToday = _dateToDBString(new Date(), "Date");
      db._onValuePromise("AllConversationRecord", DateToday).then(function (_ConversationData) {
        if (_ConversationData != null) {
          var ConversationTodayCount = 0;
          Object.keys(_ConversationData).forEach(function (_Key) {
            if (_ConversationData[_Key]["SenderID"] == senderID) {
              ConversationTodayCount += 1;
            }
          })
          if (ConversationTodayCount == 1 && PayloadArr.length == 0) {
            var OffDutyMessage = pageContent.OfficeSetting.OffDutyMessage;
            var PayloadData = {
              recipient: {
                id: senderID
              },
              message: {
                text: OffDutyMessage,
                metadata: "DEVELOPER_DEFINED_METADATA"
              }
            }
            if (pageContent.hasOwnProperty("EilisUI") && pageContent.EilisUI.hasOwnProperty("Menu")) {
              PayloadData.message["quick_replies"] = pageContent.EilisUI.Menu["公版主選單"].content.quick_replies;
            }
            callSendAPI(PayloadData, pageToken);
          }
        }
      })
    }
  },
  // 聯絡主管理員
  InformAdmin: function (messageText, pageContent, senderID, pageToken) {
    if (pageContent.CustomerService.hasOwnProperty("Admin") && pageContent.CustomerService.Keyword.split(',').indexOf(messageText) != -1) {
      var PageID = pageContent.PageBasicData.PageID;
      db._onValuePromise("EilisPSID/" + PageID + "/SenderData/GeneralSender", senderID).then(function (_ClientData) {
        var ClientName = _ClientData["last_name"] + _ClientData["first_name"];
        pageContent.CustomerService.Admin.map(function (_AdminID) {
          var PageName = pageContent.PageBasicData.PageName;
          var InformMessage = PageName + " 管理員您好，用戶 " + ClientName + " 需要真人客服服務喔，請到您管理的FB粉絲頁 " + PageName + " 信箱確認，謝謝!";
          var PayloadData = {
            recipient: {
              id: _AdminID
            },
            message: {
              text: InformMessage,
              metadata: "DEVELOPER_DEFINED_METADATA"
            }
          }
          callSendAPI(PayloadData, pageToken);
        })
      })
    }
  },
  // 加入標籤
  CreateTag: function (messageText, pageContent, senderID, pageToken) {
    var CreateTagData = {
      "PageID": pageContent.PageBasicData.PageID,
      "PSID": senderID,
      "Tag": messageText.replace("**", "")
    };
    createTag(CreateTagData).then(function () {
      console.log("粉專 " + CreateTagData.PageID + " 用戶 " + CreateTagData.PSID + " 已加入標籤 " + CreateTagData.Tag);
    }).catch(function (err) {
      errorLog._ErrorLogToDB("加入標籤發生錯誤，原因:" + err);
    })
  }
}


// Eilis 公版Funtion區

// Eilis公版藍色選單
function EilisBlueMenu(content, recipientId, pageToken) {
  var Title = (content.hasOwnProperty("EilisHintData")) ? content.EilisHintData.HintText : "歡迎，底下的藍色按鈕可能有您需要的服務喔!";
  if (content.hasOwnProperty("EilisUI") && content["EilisUI"].hasOwnProperty("Menu")) {
    var payloadData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: Title,
        metadata: "DEVELOPER_DEFINED_METADATA"
      }
    }
    payloadData.message["quick_replies"] = content.EilisUI.Menu["公版主選單"].content.quick_replies;
    callSendAPI(payloadData, pageToken);
  }
}

function callSendAPI(messageData, pageToken) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: pageToken },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id || "";
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
        console.log("Successfully called Send API for recipient %s",
          recipientId);
      }
    } else {
      errorLog._ErrorLogToDB(response.error);
    }
  });
}

function callPromiseSendAPI(messageData, pageToken, period) {
  var deferred = Q.defer();
  setTimeout(function () {
    request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: pageToken },
      method: 'POST',
      json: messageData

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;

        if (messageId) {
          console.log("Successfully sent message with id %s to recipient %s",
            messageId, recipientId);
          // setTimeout(function () {
          deferred.resolve("Succeed");
          // }, period);
        } else {
          console.log("Successfully called Send API for recipient %s",
            recipientId);
          // setTimeout(function () {
          deferred.resolve("Succeed");
          // }, period);
        }
      } else {
        errorLog._ErrorLogToDB(response.error);
        deferred.reject(response.error);
      }
    });
  }, period);
  return deferred.promise;
}

//Send a text message using the Send API.
function sendTextMessage(recipientId, messageText, pageToken) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  callSendAPI(messageData, pageToken);
}

function createTag(createTagData) {
  var deferred = Q.defer();
  request({
    uri: 'https://api.eilis-ai.com/functional/createtag',
    method: 'POST',
    json: createTagData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      deferred.resolve("Succeed");
    } else {
      errorLog._ErrorLogToDB(response.error);
      deferred.reject(response.error);
    }
  });
  return deferred.promise;
}

function CardSettingRequest(keyword, url) {
  return new Promise((resolve, reject) => {
    request({
      uri: url,
      method: 'POST',
      json: {
        "Keyword": keyword
      }
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        return resolve(body);
      } else {
        errorLog._ErrorLogToDB(response.error);
      }
    });
  })
}

function SetPayloadCard(cardEditData) {
  return new Promise((resolve, reject) => {
    request({
      uri: "https://api.eilis-ai.com/functional/SetPayload",
      method: 'POST',
      json: cardEditData
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        return resolve(body);
      } else {
        errorLog._ErrorLogToDB(response.error);
      }
    });
  })
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
    DateString = yyyy + '-' + mm + '-' + dd;
  }
  return DateString;
}

// 全形轉半形
var _fullWidthToHalfWidth = function (_Input) {
  var HalfWidthOutput = _Input.replace(
    /[\uff01-\uff5e]/g,
    function (ch) {
      // 取代全形字元
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    }
  ).replace(
    /[\u3000]/g,
    function (ch) {
      // 取代全形空白
      return String.fromCharCode(0x20);
    });
  return HalfWidthOutput;
}

// 半形轉全形(Firebase特殊字元處理)
function HalfWidthToFullWidth(input) {
  return input.replace("$", "＄").replace("#", "＃").replace(".", "．").replace("[", "［").replace("]", "］");
}