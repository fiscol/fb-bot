const request = require('request');
const db = require('../../db/firebase_db.js');
const TimeNow = require('../../tool/TimeNow');
const DBQuery = require("../../tool/DBQuery");
const FB = require('fb');
const EilisFunctionModel = require('../model/eilis_function_model');
const errorLog = require('../../tool/ErrorLog.js');
const requestPromise = require('request-promise');
const Q = require("q");

require('es6-promise');

// 儲存新用戶資料到表單
function SaveUserToPSIDSheet(NewPageSenderBasicData, SenderID, PageID) {
  return new Promise((resolve, reject) => {
    try {
      var PostData = [
        SenderID,
        NewPageSenderBasicData.last_name + " " + NewPageSenderBasicData.first_name,
        (!NewPageSenderBasicData.hasOwnProperty("gender")) ? "無設定" : (NewPageSenderBasicData.gender == "female") ? "女" : "男",
        "",
        "",
        NewPageSenderBasicData.SenderRegiestTime
      ];
      db._onValuePromise("EilisPSID/" + PageID, "SheetData").then(function (_SheetData) {
        // 已經存在表單, 直接寫入新用戶資料
        if (_SheetData != null) {
          var SheetData = {
            "SheetID": _SheetData.SheetID,
            "PostData": [PostData]
          }
          addPageUserData(SheetData).then(function (_Result) {
            resolve("已儲存新用戶資料到表單");
          })
        }
        // 不存在表單, 先建立用戶表單再寫入新用戶資料
        else {
          db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageData) {
            var PageName = _PageData.PageName;
            createPSIDSheet(PageID, PageName).then(function (_SheetData) {
              db._update("EilisPSID/" + PageID, "SheetData", _SheetData).then(function () {
                var SheetData = {
                  "SheetID": _SheetData.SheetID,
                  "PostData": [PostData]
                }
                addPageUserData(SheetData).then(function (_Result) {
                  resolve("已儲存新用戶資料到表單");
                })
              })
            });
          })
        }
      })
    }
    catch (err) {
      reject(err);
      errorLog._ErrorLogToDB("寫入新用戶到表單出現錯誤:" + err);
    }
  })
}

function createPSIDSheet(pageID, pageName) {
  var deferred = Q.defer();
  var options = {
    uri: 'https://mavis-activity.herokuapp.com/api/createPSIDSheet',
    headers: {
      'User-Agent': 'Request-Promise'
    },
    method: 'POST',
    body: {
      "PageID": pageID,
      "PageName": pageName
    },
    json: true
  };

  requestPromise(options)
    .then(function (parsedBody) {
      console.log("創建用戶資料表單成功:" + JSON.stringify(parsedBody));
      deferred.resolve(parsedBody);
    })
    .catch(function (err) {
      errorLog._ErrorLogToDB("新增用戶資料表單失敗, 原因:" + err);
      deferred.reject(err);
    });
  return deferred.promise;
}

function addPageUserData(postData) {
  var deferred = Q.defer();
  var options = {
    uri: 'https://mavis-activity.herokuapp.com/api/addPageUserData',
    headers: {
      'User-Agent': 'Request-Promise'
    },
    method: 'POST',
    body: postData,
    json: true
  };

  requestPromise(options)
    .then(function (parsedBody) {
      deferred.resolve(parsedBody);
    })
    .catch(function (err) {
      errorLog._ErrorLogToDB("寫入用戶資料失敗, 原因:" + err);
      deferred.resolve(err);
    });
  return deferred.promise;
}

function addTagUserCount(pageID, tagArray) {
  var deferred = Q.defer();
  var options = {
    uri: 'https://api.eilis-ai.com/functional/addTagUserCount',
    headers: {
      'User-Agent': 'Request-Promise'
    },
    method: 'POST',
    body: {
      "PageID": pageID,
      "TagArray": tagArray
    },
    json: true
  };

  requestPromise(options)
    .then(function (parsedBody) {
      deferred.resolve(parsedBody);
    })
    .catch(function (err) {
      errorLog._ErrorLogToDB("更新Tag計數失敗, 原因:" + err);
      deferred.resolve(err);
    });
  return deferred.promise;
}

var CheckPageTagInit = function (pageID, gender) {
  return db._onValuePromise("EilisPSID/" + pageID, "Tag").then(function (_PageTagData) {
    if (_PageTagData == null) {
      var PageTagData = {
        "Tag": ["GeneralSender", "male", "female"],
        "UserCount": {
          "GeneralSender": 1,
          "male": (gender != null && gender == "male") ? 1 : 0,
          "female": (gender != null && gender == "female") ? 1 : 0
        }
      };
      return db._update("EilisPSID", pageID, PageTagData).then(function () {
        return Promise.resolve({ "Message": "已成功加入頁面Tag" });
      });
    }
    else {
      var TagArray = ["GeneralSender"];
      if (gender != null) {
        TagArray.push(gender);
      }
      return addTagUserCount(pageID, TagArray).then(function () {
        return Promise.resolve({ "Message": "頁面Tag已存在" });
      })
    }
  }).catch(function (err) {
    return Promise.reject({ "Error": "加入頁面Tag失敗，原因:" + err });
  })
}

module.exports = {
  // 第一次對話的新粉絲，儲存資訊 
  SaveNewPageSenderBasicData: function (senderID, pageID, pageToken) {

    var Ref = "EilisPSID"
    var Child = pageID + "/SenderData/GeneralSender/" + senderID;

    return db._onValuePromise(Ref, Child).then(function (SenderData) {

      // 若為原有Sender
      if (SenderData != null) {
        return Promise.resolve('粉專已有紀錄粉絲SenderID');
      }
      // 第一次與粉專互動
      else {
        // 將UserData初次儲存至DB EilisPSID
        var NewPageSenderBasicData = new Object();

        // 撈取Sender FB 基本資料
        FB.setAccessToken(pageToken);
        return FB.api('/' + senderID, function (SenderFBData) {
          console.log('新用戶互動:' + JSON.stringify(SenderFBData));
          if (!SenderFBData || SenderFBData.error) {
            return Promise.reject(new Error('取得SenderFBData錯誤'));
          } else {
            NewPageSenderBasicData = SenderFBData;
            NewPageSenderBasicData.Tag = ['GeneralSender'];
            var Gender = null;
            if (NewPageSenderBasicData.hasOwnProperty("gender")) {
              NewPageSenderBasicData.Tag.push(NewPageSenderBasicData.gender);
              Gender = NewPageSenderBasicData.gender;
            }
            NewPageSenderBasicData.SenderRegiestTime = TimeNow.TimeNow();

            return SaveUserToPSIDSheet(NewPageSenderBasicData, senderID, pageID).then(function () {
              NewPageSenderBasicData.SaveToSheet = true;
              return db._set(Ref, Child, NewPageSenderBasicData).then(function () {
                return CheckPageTagInit(pageID, Gender).then(function () {
                  return Promise.resolve('新粉絲互動');
                })
              })
            })
            // NewPageSenderBasicData:
            // { 
            //   first_name: '鈺群',
            //   last_name: '許',
            //   profile_pic: 'https://scontent.xx.fbcdn.net/v/t1.0-1/10426634_10205782059245765_1255482092143314707_n.jpg?oh=796ffbb4a676d668914b668db954d939&oe=596ACCF0',
            //   locale: 'zh_TW',
            //   timezone: 8,
            //   gender: 'male',
            //   Tag: 'GeneralSender',
            //   SenderRegiestTime: '2017/03/29 18:47:32' 
            // }
          }
        });


      }
    }, function (error) {
      errorLog._ErrorLogToDB("Failed:" + error);
      return Promise.reject(new Error(Error));
    })


  },

  // 儲存所有粉絲頁的粉絲對話紀錄
  SavePageSenderConversationRecord: function (messageText, senderID, pageID, pageToken) {
    console.log('進入對話紀錄')
    var Ref = "AllConversationRecord";
    var Child = TimeNow.DateNowDBChild();
    var SenderMessageObj = new Object();

    SenderMessageObj.SendTime = TimeNow.TimeNow();
    SenderMessageObj.SenderID = senderID;
    SenderMessageObj.TargetID = pageID;
    SenderMessageObj.MessageText = messageText;

    db._push(Ref, Child, SenderMessageObj);


  },



}


