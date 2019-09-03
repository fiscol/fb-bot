var db = require('../../../db/firebase_db.js');
var TimeNow = require('../../../tool/TimeNow.js');
var Q = require('q');
/** JSONWebToken
// 參考資源:
// https://github.com/auth0/node-jsonwebtoken
**/
const jwt = require('jsonwebtoken');

var UserData = function (userID) {
  this.userID = userID;
}

UserData.prototype._GetFBData = function (userID) {
  var Ref = "EilisUser";
  var Child = userID + "/UserBasicData";
  var UserBasicData = new Object();
  return db._onValuePromise(Ref, Child).then(function (DBUserData) {
    if (DBUserData != null) {
      if (DBUserData.hasOwnProperty("AllPageData")) {
        for (var i = Object.keys(DBUserData.AllPageData.data).length - 1; i >= 0; i--) {
          // 有粉專管理者權限才回傳該專頁資訊
          if (DBUserData.AllPageData.data[i]["perms"].indexOf("ADMINISTER") != -1) {
            delete DBUserData.AllPageData.data[i].access_token;
            delete DBUserData.AllPageData.data[i].category;
            delete DBUserData.AllPageData.data[i].perms;
          }
          // 沒有粉專管理者權限
          else {
            // 是Eilis設定的共用管理者，回傳該專頁資訊
            if (DBUserData.AllPageData.data[i]["status"] == "Editable Page") {
              delete DBUserData.AllPageData.data[i].access_token;
              delete DBUserData.AllPageData.data[i].category;
              delete DBUserData.AllPageData.data[i].perms;
            }
            // 不是Eilis設定的共用管理者，不回傳該專頁資訊
            else {
              DBUserData.AllPageData.data.splice(i, 1);
            }
          }
        }
      }
      else {
        DBUserData.AllPageData = {};
        DBUserData.AllPageData.data = [];
      }
      if (DBUserData.AllPageData.paging) {
        delete DBUserData.AllPageData.paging;
      }
      if (DBUserData.CardKeys) {
        delete DBUserData.CardKeys;
      }
      return Promise.resolve(DBUserData);
    }
    else {
      return Promise.reject(new Error("找不到對應會員資料"));
    }
  }).catch(function (err) {
    return Promise.reject(new Error(err));
  });
}

UserData.prototype._CheckUserToken = function (userID) {
  var Ref = "EilisUser/" + userID;
  var Child = "UserBasicData";
  return db._onValuePromise(Ref, Child).then(function (DBUserData) {
    if (DBUserData != null) {
      if (DBUserData.hasOwnProperty("UserToken")) {
        return Promise.resolve(DBUserData.UserToken);
      }
      else {
        return Promise.resolve(false);
      }
    }
    else {
      return Promise.resolve(false);
    }
  }).catch(function (err) {
    return Promise.reject(new Error(err));
  });
}

UserData.prototype._RefreshBonusDays = function () {
  return new Promise((resolve, reject) => {
    var Ref = "EilisUser";
    db._onValuePromiseWithoutChild(Ref).then(function (_UserData) {
      var UsersArray = Object.getOwnPropertyNames(_UserData);
      for (var i = 0; i < UsersArray.length; i++) {
        var UserID = UsersArray[i];
        // 正常扣除免費天數
        if (_UserData[UserID].hasOwnProperty("UserBasicData") && _UserData[UserID]["UserBasicData"].hasOwnProperty("PageAdded") && _UserData[UserID]["UserBasicData"]["PageAdded"] == true && _UserData[UserID]["UserBasicData"]["BonusDays"] > 0) {
          // 免費天數今日扣除後歸零，尚未付費的用戶
          if (_UserData[UserID]["UserBasicData"]["BonusDays"] == 1 && _UserData[UserID]["TradeInfo"]["PurchasedService"]["PayStatus"] == "Not Paid") {
            //提醒Eilis管理帳號
            var UserName = _UserData[UserID]["UserBasicData"]["UserName"];
            var Message = "用戶 " + UserName + "(" + UserID + ") 個人帳號免費試用期已到期，請協助通知用戶，謝謝！"
            _sendMessageToEilisAdmin(Message).then(function () {
              console.log("已通知Eilis管理者用戶免費試用期已到期");
            }).catch(function (err) {
              console.error("通知Eilis管理者用戶免費試用期已到期失敗，原因：" + err);
            })
          }
          Ref = "EilisUser/" + UserID + "/UserBasicData/BonusDays";
          db._transactionCount(Ref, -1, function (_Count) {
            console.log("更新用戶BonusDays OK.");
          });
        }
        // 免費天數歸零，付費已到期的用戶
        else if (_UserData[UserID].hasOwnProperty("UserBasicData") && _UserData[UserID]["UserBasicData"].hasOwnProperty("PageAdded") && _UserData[UserID]["UserBasicData"]["PageAdded"] == true && _UserData[UserID]["UserBasicData"]["BonusDays"] == 0 && _UserData[UserID]["TradeInfo"]["PurchasedService"]["PayStatus"] == "Paid") {
          var Today = new Date().toISOString().substring(0, 10);
          var ExpiredDay = _UserData[UserID]["TradeInfo"]["PurchasedService"]["AuthData"][_UserData[UserID]["TradeInfo"]["PurchasedService"]["AuthData"].length - 1]["NextInformDate"];
          if (Today == ExpiredDay) {
            var UserName = _UserData[UserID]["UserBasicData"]["UserName"];
            _changePayStatus(UserID, UserName, _UserData[UserID]["UserBasicData"]["AllPageData"]["data"]);
          }
        }
      }
      return resolve("更新所有用戶BonusDays完成");
    }).catch(function (err) {
      console.log("取得用戶資料發生錯誤, 原因:" + err);
      return reject("取得用戶資料發生錯誤, 原因:" + err);
    });
  });
}

UserData.prototype._GenerateWebToken = function (userID) {
  return new Promise((resolve, reject) => {
    var JWTOptions = {};
    JWTOptions.secretOrKey = 'eilisSecondServer';
    var Payload = { UserID: userID };
    // 預設WebToken有效期間為兩週
    var WebToken = jwt.sign(Payload, JWTOptions.secretOrKey, { expiresIn: "14d" });
    return resolve({ Message: "ok", WebToken: WebToken });
  });
}

UserData.prototype._VerifyWebToken = function (userID, webToken) {
  return new Promise((resolve, reject) => {
    var Ref = "EilisUser/" + userID;
    var Child = "UserBasicData";
    db._onValuePromise(Ref, Child).then(function (_UserBasicData) {
      // 狀態為登入, 且Token權限足夠
      if (_UserBasicData != null && _UserBasicData.hasOwnProperty("WebToken") && _UserBasicData.WebToken == webToken) {
        var JWTOptions = {};
        JWTOptions.secretOrKey = 'eilisSecondServer';
        jwt.verify(webToken, JWTOptions.secretOrKey, function (err, decoded) {
          if (err) {
            /*
              err = {
                name: 'TokenExpiredError',
                message: 'jwt expired',
                expiredAt: 1408621000
              }
            */
            // UserID正確, WebToken過期(清除DB Token, 回傳狀態碼, 前端需要轉跳到登入頁面)
            if (err.name == "TokenExpiredError") {
              var ExpiredAt = _dateToDBString(new Date(err.expiredAt), "DateTime");
              delete _UserBasicData.WebToken;
              db._set(Ref, Child, _UserBasicData).then(function (_Result) {
                return reject({ "LoginError": "用戶權限過期，系統已自動登出，過期時間為：" + ExpiredAt + "，請重新登入Eilis系統" });
              }).catch(function (err) {
                return reject({ "LoginError": "用戶權限過期，登出時發生錯誤，原因:" + err + "，請重新登入Eilis系統" });
              });
            }
            // WebToken無法解密, 沒有權限查詢(回傳狀態碼, 說明無權限查詢)
            else {
              return reject({ "Error": "沒有使用權限設定Eilis功能" });
            }
          }
          else {
            // UserID正確, 且沒有過期(Next)
            if (decoded.UserID == userID) {
              decoded.ExpiredAt = _dateToDBString(new Date(decoded.exp * 1000), "DateTime");
              delete decoded.exp;
              delete decoded.iat;
              return resolve({ "Message": "ok", "Data": decoded });
            }
            // UserID不同, 沒有權限查詢(回傳狀態碼, 說明無權限查詢)
            else {
              return reject({ "Error": "您沒有查詢此用戶資訊的權限喔" });
            }
          }
        });
      }
      else if (_UserBasicData != null && !_UserBasicData.hasOwnProperty("WebToken")) {
        return reject({ "LoginError": "用戶尚未登入，請重新登入Eilis系統" });
      }
      else {
        return reject({ "Error": "您沒有查詢此用戶資訊的權限喔" });
      }
    }).catch(function (err) {
      return reject({ "Error": "您沒有查詢此用戶資訊的權限喔" });
    });
  });
}

UserData.prototype._LogoutEilis = function (userID, webToken) {
  return new Promise((resolve, reject) => {
    var Ref = "EilisUser/" + userID;
    var Child = "UserBasicData";
    db._onValuePromise(Ref, Child).then(function (_UserBasicData) {
      // 用戶狀態為登入
      if (_UserBasicData != null && _UserBasicData.hasOwnProperty("WebToken") && _UserBasicData.WebToken == webToken) {
        delete _UserBasicData.WebToken;
        db._set(Ref, Child, _UserBasicData).then(function (_Result) {
          return resolve({ "Message": "用戶已成功登出" });
        }).catch(function (err) {
          return reject({ "Error": "登出失敗，原因:" + err });
        });
      }
      else if (_UserBasicData != null && !_UserBasicData.hasOwnProperty("WebToken")) {
        return reject({ "Error": "用戶尚未登入，無法執行登出功能" });
      }
      else {
        return reject({ "Error": "找不到此用戶，登出失敗" });
      }
    }).catch(function (err) {
      return reject({ "Error": "找不到此用戶，登出失敗" });
    });
  });
}

var _changePayStatus = function (_UserID, _UserName, _AllPageData) {
  //變更用戶付費狀態為未付費
  db._update("EilisUser/" + _UserID + "/TradeInfo", "PurchasedService", { "PayStatus": "Not Paid" }).then(function () {
    console.log("用戶 " + _UserName + "(" + _UserID + ") 個人帳號付費狀態已變更為未付費");
  }).catch(function (err) {
    console.error("用戶 " + _UserName + "(" + _UserID + ") 個人帳號付費狀態變更失敗，原因：" + err);
  })
  //變更所有管理粉專付費狀態為未付費
  for (var i = 0; i < _AllPageData.length; i++) {
    if (_AllPageData[i]["status"] == "Started, Already Paid Page") {
      _AllPageData[i]["status"] = "Started, Not Paid Page";
    }
    else if (_AllPageData[i]["status"] == "Suspended, Already Paid Page") {
      _AllPageData[i]["status"] = "Suspended, Not Paid Page";
    }
    if (i == _AllPageData.length - 1) {
      db._update("EilisUser/" + _UserID + "/UserBasicData", "AllPageData", { "data": _AllPageData }).then(function () {
        console.log("用戶 " + _UserName + "(" + _UserID + ") 粉專付費狀態已變更為未付費");
      }).catch(function (err) {
        console.error("用戶 " + _UserName + "(" + _UserID + ") 粉專付費狀態變更失敗，原因：" + err);
      })
    }
  }
  //提醒Eilis管理帳號用戶付費狀態已過期
  var Message = "用戶 " + _UserName + "(" + _UserID + ") 個人帳號付費已於今日過期，請協助通知用戶，謝謝！"
  _sendMessageToEilisAdmin(Message).then(function () {
    console.log("已通知Eilis管理者用戶付費狀態已過期");
  }).catch(function (err) {
    console.error("通知Eilis管理者用戶付費狀態已過期失敗，原因：" + err);
  })
}

// 通知Eilis粉專管理員
function _sendMessageToEilisAdmin(message) {
  var deferred = Q.defer();
  db._onValuePromise("EilisFB", "948751308600303").then(function (_EilisPageData) {
    var PageToken = _EilisPageData.PageBasicData.PageToken;
    var PayloadData = {
      recipient: {
        id: "1689665624441748" // 目前預設會通知 "Eilis AI" 的帳號
      },
      message: {
        text: message,
        metadata: "DEVELOPER_DEFINED_METADATA"
      }
    }
    callSendAPI(PayloadData, PageToken).then(function () {
      deferred.resolve("OK.");
    }).catch(function (err) {
      deferred.reject(err);
    });
  }).catch(function (err) {
    deferred.reject(err);
  })
  return deferred.promise;
}

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

module.exports = UserData;