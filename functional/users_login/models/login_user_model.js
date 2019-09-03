var db = require('../../../db/firebase_db.js');
var TimeNow = require('../../../tool/TimeNow.js');
var errorLog = require('../../../tool/ErrorLog.js');
var payloadModel = require('../../../fb_routes/model/payload_model.js');
var Q = require('q');
var request = require('request');

var LoginUser = function (fansPageInfo, userDetail, userToken) {
  // 管理粉專資訊
  this.fansPageInfo = fansPageInfo;
  // 用戶UserID, Email等用戶資訊
  this.userDetail = userDetail;
  this.userToken = userToken;
}

LoginUser.prototype.SaveUserBasicData = function (fansPageInfo, userDetail, userToken, webToken, bonusCode, bonusDays) {
  // 將UserData初次儲存至DB EilisUser
  var Ref = "EilisUser";
  var Child = userDetail.id + "/UserBasicData";
  var UserBasicData = new Object();
  // 判斷是否為舊會員
  return db._onValuePromise(Ref, Child).then(function (DBUserData) {
    // 取得所有Eilis系統已註冊的粉專
    return db._onValuePromiseWithoutChild("EilisFB").then(function (AllFBPageData) {
      var PromiseArr = [];
      //若會員註冊資料存在DB(原會員重新登入)
      if (DBUserData != null) {
        // 更新最後登入時間
        UserBasicData.LastLoginTime = TimeNow.TimeNow();
        if (userDetail.hasOwnProperty("email")) {
          UserBasicData.Email = userDetail.email;
        }
        // 更新頭貼連結
        UserBasicData.Picture = userDetail.picture.data.url;
        // 更新粉專資訊
        if (DBUserData.hasOwnProperty("AllPageData")) {
          // DBUserData.AllPageData.data: 舊的管理粉專資料
          for (var i = 0; i < DBUserData.AllPageData.data.length; i++) {
            // fansPageInfo.data: 重新登入取得的粉專資料
            for (var j = 0; j < fansPageInfo.data.length; j++) {
              var OldPage = DBUserData.AllPageData.data[i];
              var NewPage = fansPageInfo.data[j];
              // 找到新的管理專頁, 初始化Eilis設定狀態屬性
              if (OldPage["id"] != NewPage["id"] && !NewPage.hasOwnProperty("status")) {
                // 沒有被註冊Eilis, 也沒有被設定過的專頁
                if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
                  fansPageInfo.data[j]["status"] = 'Not Enabled Page';
                }
                // 已經被註冊的Eilis專頁
                else {
                  // 被其他管理者註冊過的Eilis專頁，DB設定回寫為已被註冊的狀態
                  if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userDetail.id) {
                    if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                      fansPageInfo.data[j]["status"] = 'Registered Page';
                    }
                    else {
                      var UserIDIsEditor = false;
                      AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                        if (_EditerData.UserID == userDetail.id) {
                          UserIDIsEditor = true;
                        }
                        if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                          fansPageInfo.data[j]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                        }
                      })
                    }
                  }
                  // 自己註冊過的Eilis專頁
                  else {
                    fansPageInfo.data[j]["status"] = OldPage["status"];
                  }
                  // 只有原粉專主管理者登入，才會重新更新粉專Token
                  if (fansPageInfo.data[j]["status"] != "Editable Page" && fansPageInfo.data[j]["status"] != "Registered Page") {
                    PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
                  }
                }
              }
              // 已加入的專頁, 保留原本的Eilis設定狀態屬性
              else if (OldPage["id"] == NewPage["id"] && OldPage.hasOwnProperty("status")) {
                // 沒有被註冊Eilis的專頁
                if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
                  fansPageInfo.data[j]["status"] = OldPage["status"];
                }
                // 已經被其他使用者註冊的Eilis專頁
                else {
                  if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userDetail.id) {
                    if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                      fansPageInfo.data[j]["status"] = 'Registered Page';
                    }
                    else {
                      var UserIDIsEditor = false;
                      AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                        if (_EditerData.UserID == userDetail.id) {
                          UserIDIsEditor = true;
                        }
                        if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                          fansPageInfo.data[j]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                        }
                      })
                    }
                  }
                  // 自己註冊過的Eilis專頁
                  else {
                    fansPageInfo.data[j]["status"] = OldPage["status"];
                  }
                  // 只有原粉專主管理者登入，才會重新更新粉專Token
                  if (fansPageInfo.data[j]["status"] != "Editable Page" && fansPageInfo.data[j]["status"] != "Registered Page") {
                    PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
                  }
                }
              }
            }
          }
        }
        else {
          for (var j = 0; j < fansPageInfo.data.length; j++) {
            var NewPage = fansPageInfo.data[j];
            // 沒有被註冊Eilis的專頁
            if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
              fansPageInfo.data[j]["status"] = 'Not Enabled Page';
            }
            // 已經被其他使用者註冊的Eilis專頁
            else if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userDetail.id) {
              if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                fansPageInfo.data[j]["status"] = 'Registered Page';
              }
              else {
                var UserIDIsEditor = false;
                AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                  if (_EditerData.UserID == userDetail.id) {
                    UserIDIsEditor = true;
                  }
                  if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                    fansPageInfo.data[j]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                  }
                })
              }
              // 只有原粉專主管理者登入，才會重新更新粉專Token
              if (fansPageInfo.data[j]["status"] != "Editable Page" && fansPageInfo.data[j]["status"] != "Registered Page") {
                PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
              }
            }
          }
        }
        var Step1 = Q.all(PromiseArr);
        Step1.then(function () {
          UserBasicData.AllPageData = fansPageInfo;
          UserBasicData.WebToken = webToken;
          UserBasicData.UserToken = userToken;
          if (bonusCode != "None" && DBUserData.hasOwnProperty("BonusCode") && DBUserData.BonusCode != bonusCode) {
            UserBasicData.BonusCode = bonusCode;
            UserBasicData.BonusDays = bonusDays;
          }
          return db._update(Ref, Child, UserBasicData).then(function (_Result) {
            console.log('原會員重新登入');
            return Promise.resolve('原Eilis會員登入');
          }).catch(function (err) {
            errorLog._ErrorLogToDB('原會員登入失敗' + err);
            return Promise.reject('原Eilis會員登入失敗:' + err);
          });
        }).catch(function (err) {
          res.json({ "Error": "原會員登入更新Token失敗，原因：" + err });
        });
      }

      // 若為新會員註冊
      else {
        // 解析所有專頁, 初始化Eilis設定狀態屬性
        for (var i = 0; i < fansPageInfo.data.length; i++) {
          var NewPage = fansPageInfo.data[i];
          // 沒有被註冊Eilis的專頁
          if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
            fansPageInfo.data[i]["status"] = 'Not Enabled Page';
          }
          // 已經被其他使用者註冊的Eilis專頁
          else {
            if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userDetail.id) {
              if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                fansPageInfo.data[i]["status"] = 'Registered Page';
              }
              else {
                var UserIDIsEditor = false;
                AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                  if (_EditerData.UserID == userDetail.id) {
                    UserIDIsEditor = true;
                  }
                  if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                    fansPageInfo.data[i]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                  }
                })
              }
              // 只有原粉專主管理者登入，才會重新更新粉專Token
              if (fansPageInfo.data[i]["status"] != "Editable Page" && fansPageInfo.data[i]["status"] != "Registered Page") {
                PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
              }
            }
            else {
              fansPageInfo.data[i]["status"] = 'Not Enabled Page';
            }
          }
        }
        // 初始化資料
        UserBasicData.AllPageData = fansPageInfo;
        UserBasicData.UserName = userDetail.name;
        if (userDetail.hasOwnProperty("email")) {
          UserBasicData.Email = userDetail.email;
        }
        UserBasicData.UserID = userDetail.id;
        UserBasicData.Picture = userDetail.picture.data.url;
        UserBasicData.RegiestTime = TimeNow.TimeNow();
        UserBasicData.LastLoginTime = TimeNow.TimeNow();
        UserBasicData.BonusCode = bonusCode;
        UserBasicData.BonusDays = bonusDays;
        UserBasicData.PageAdded = false;
        UserBasicData.WebToken = webToken;
        UserBasicData.UserToken = userToken;

        var Step1 = Q.all(PromiseArr);
        Step1.then(function () {
          return db._update(Ref, Child, UserBasicData).then(function (_Result) {
            console.log('新會員註冊')
            return Promise.resolve('Eilis新會員加入');
          }).catch(function (err) {
            return Promise.reject('Eilis新會員加入失敗:' + err);
          });
        }).catch(function (err) {
          res.json({ "Error": "新會員登入更新Token失敗，原因：" + err });
        });


      }
    }).catch(function (err) {
      return Promise.reject(new Error(err));
    })
  }).catch(function (err) {
    return Promise.reject(new Error(err));
  });
}

// 取得一般互動用戶的UserID, Email資訊到粉專的PSID內部
LoginUser.prototype.SaveUserInfoToPSID = function (pageID, psid, cardID, buttonID, cardAt, basicResult) {
  var deferred = Q.defer();
  db._onValuePromise("EilisFB", pageID)
    .then(function (_PageData) {
      var PageToken = _PageData["PageBasicData"]["PageToken"];
      var UpdateData = {
        "UserID": basicResult.id
      }
      // var EmailData = "";
      if (basicResult.hasOwnProperty("email")) {
        UpdateData.Email = basicResult.email;
        // EmailData = "\n您的Email是:" + basicResult.email;
      }
      // else {
      //   EmailData = "\n但您沒有在FB編輯您的Email喔!";
      // }
      db._update("EilisPSID/" + pageID + "/SenderData/GeneralSender", psid, UpdateData).then(function (_Result) {
        // var PayloadContent = {
        //   "content": {
        //     "metadata": "DEVELOPER_DEFINED_METADATA",
        //     "text": "您已登入成功了!" + EmailData
        //   },
        //   "edit": {
        //     "Message": "您已登入成功了!" + EmailData
        //   },
        //   "type": "Message"
        // }
        // if (_PageData.hasOwnProperty("EilisUI") && _PageData.EilisUI.hasOwnProperty("Menu")) {
        //   var Payload = new payloadModel(pageID, psid, PayloadContent, _PageData.EilisUI.Menu["公版主選單"].content.quick_replies, null);
        //   callSendAPI(Payload.Data, PageToken);
        // }
        // else {
        //   var Payload = new payloadModel(pageID, psid, PayloadContent, null, null);
        //   callSendAPI(Payload.Data, PageToken);
        // }

        db._onValuePromise("EilisPSID/" + pageID, "SheetData").then(function (_SheetData) {
          var PostData = {
            "UserID": basicResult.id || "",
            "Email": basicResult.email || "",
            "PSID": psid
          }
          updateEmailDataToSheet(_SheetData.SheetID, PostData).then(function () {
            // 如果沒有導頁設定，預設導頁到Eilis服務
            var RedirectUrl = "http://mobile-beta.eilis-ai.com";
            // 單張卡片的按鈕
            if (cardAt == null) {
              RedirectUrl = _PageData["EilisUI"]["Payload"][cardID]["edit"]["ButtonData"][buttonID]["Url"];
            }
            // BoxCard的按鈕
            else {
              RedirectUrl = _PageData["EilisUI"]["Payload"][cardID]["edit"][cardAt]["ButtonData"][buttonID]["Url"];
            }
            // 帶入用戶Email參數
            if (RedirectUrl.indexOf('?') != -1 && basicResult.hasOwnProperty("email")) {
              RedirectUrl += "&Email=" + basicResult.email;
            }
            else if (basicResult.hasOwnProperty("email")) {
              RedirectUrl += "?Email=" + basicResult.email;
            }
            // 回傳導頁連結
            deferred.resolve(RedirectUrl);
          }).catch(function (err) {
            deferred.reject(err);
          })
        }).catch(function (err) {
          deferred.reject(err);
        })
      }).catch(function (err) {
        deferred.reject(err);
      })
    }).catch(function (err) {
      deferred.reject(err);
    })
  return deferred.promise;
}

LoginUser.prototype.SaveUserFansPageData = function (fansPageInfo, userID) {
  // 將UserData初次儲存至DB EilisUser
  var Ref = "EilisUser";
  var Child = userID + "/UserBasicData";
  var UserBasicData = new Object();
  // 判斷是否為舊會員
  return db._onValuePromise(Ref, Child).then(function (DBUserData) {
    return db._onValuePromiseWithoutChild("EilisFB").then(function (AllFBPageData) {
      var PromiseArr = [];
      //若會員註冊資料存在DB(原會員重新登入)
      if (DBUserData != null) {
        // 更新粉專資訊
        if (DBUserData.hasOwnProperty("AllPageData")) {
          // DBUserData.AllPageData.data: 舊的管理粉專資料
          for (var i = 0; i < DBUserData.AllPageData.data.length; i++) {
            // fansPageInfo.data: 重新登入取得的粉專資料
            for (var j = 0; j < fansPageInfo.data.length; j++) {
              var OldPage = DBUserData.AllPageData.data[i];
              var NewPage = fansPageInfo.data[j];
              // 找到新的管理專頁, 初始化Eilis設定狀態屬性
              if (OldPage["id"] != NewPage["id"] && !NewPage.hasOwnProperty("status")) {
                // 沒有被註冊Eilis, 也沒有被設定過的專頁
                if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
                  fansPageInfo.data[j]["status"] = 'Not Enabled Page';
                }
                // 已經被註冊的Eilis專頁
                else {
                  // 被其他管理者註冊過的Eilis專頁，DB設定回寫為已被註冊的狀態
                  if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userID) {
                    if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                      fansPageInfo.data[j]["status"] = 'Registered Page';
                    }
                    else {
                      var UserIDIsEditor = false;
                      AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                        if (_EditerData.UserID == userID) {
                          UserIDIsEditor = true;
                        }
                        if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                          fansPageInfo.data[j]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                        }
                      })
                    }
                  }
                  // 自己註冊過的Eilis專頁
                  else {
                    fansPageInfo.data[j]["status"] = OldPage["status"];
                  }
                  // 只有原粉專主管理者登入，才會重新更新粉專Token
                  if (fansPageInfo.data[j]["status"] != "Editable Page" && fansPageInfo.data[j]["status"] != "Registered Page") {
                    PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
                  }
                }
              }
              // 已加入的專頁, 保留原本的Eilis設定狀態屬性
              else if (OldPage["id"] == NewPage["id"] && OldPage.hasOwnProperty("status")) {
                // 沒有被註冊Eilis的專頁
                if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
                  fansPageInfo.data[j]["status"] = OldPage["status"];
                }
                // 已經被其他使用者註冊的Eilis專頁
                else {
                  if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userID) {
                    if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                      fansPageInfo.data[j]["status"] = 'Registered Page';
                    }
                    else {
                      var UserIDIsEditor = false;
                      AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                        if (_EditerData.UserID == userID) {
                          UserIDIsEditor = true;
                        }
                        if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                          fansPageInfo.data[j]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                        }
                      })
                    }
                  }
                  // 自己註冊過的Eilis專頁
                  else {
                    fansPageInfo.data[j]["status"] = OldPage["status"];
                  }
                  // 只有原粉專主管理者登入，才會重新更新粉專Token
                  if (fansPageInfo.data[j]["status"] != "Editable Page" && fansPageInfo.data[j]["status"] != "Registered Page") {
                    PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                    PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
                  }
                }
              }
            }
          }
        }
        else {
          for (var j = 0; j < fansPageInfo.data.length; j++) {
            var NewPage = fansPageInfo.data[j];
            // 沒有被註冊Eilis的專頁
            if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
              fansPageInfo.data[j]["status"] = 'Not Enabled Page';
            }
            // 已經被其他使用者註冊的Eilis專頁
            else if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userID) {
              if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                fansPageInfo.data[j]["status"] = 'Registered Page';
              }
              else {
                var UserIDIsEditor = false;
                AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                  if (_EditerData.UserID == userID) {
                    UserIDIsEditor = true;
                  }
                  if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                    fansPageInfo.data[j]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                  }
                })
              }
              // 只有原粉專主管理者登入，才會重新更新粉專Token
              if (fansPageInfo.data[j]["status"] != "Editable Page" && fansPageInfo.data[j]["status"] != "Registered Page") {
                PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
              }
            }
          }
        }
        var Step1 = Q.all(PromiseArr);
        Step1.then(function () {
          UserBasicData.AllPageData = fansPageInfo;
          return db._update(Ref, Child, UserBasicData).then(function (_Result) {
            console.log('原會員重新登入');
            return Promise.resolve('原Eilis會員登入');
          }).catch(function (err) {
            errorLog._ErrorLogToDB('原會員登入失敗' + err);
            return Promise.reject('原Eilis會員登入失敗:' + err);
          });
        }).catch(function (err) {
          res.json({ "Error": "原會員登入更新Token失敗，原因：" + err });
        });
      }

      // 若為新會員註冊
      else {
        // 解析所有專頁, 初始化Eilis設定狀態屬性
        for (var i = 0; i < fansPageInfo.data.length; i++) {
          var NewPage = fansPageInfo.data[i];
          // 沒有被註冊Eilis的專頁
          if (!AllFBPageData.hasOwnProperty(NewPage["id"])) {
            fansPageInfo.data[i]["status"] = 'Not Enabled Page';
          }
          // 已經被其他使用者註冊的Eilis專頁
          else {
            if (AllFBPageData[NewPage["id"]].hasOwnProperty("PageBasicData") && AllFBPageData[NewPage["id"]]["PageBasicData"]["PageAdmin"]["UserID"] != userID) {
              if (!AllFBPageData[NewPage["id"]]["PageBasicData"].hasOwnProperty("PageEditor")) {
                fansPageInfo.data[i]["status"] = 'Registered Page';
              }
              else {
                var UserIDIsEditor = false;
                AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].map(function (_EditerData, _Index) {
                  if (_EditerData.UserID == userID) {
                    UserIDIsEditor = true;
                  }
                  if (_Index == AllFBPageData[NewPage["id"]]["PageBasicData"]["PageEditor"].length - 1) {
                    fansPageInfo.data[i]["status"] = (UserIDIsEditor == true) ? 'Editable Page' : 'Registered Page';
                  }
                })
              }
              // 只有原粉專主管理者登入，才會重新更新粉專Token
              if (fansPageInfo.data[i]["status"] != "Editable Page" && fansPageInfo.data[i]["status"] != "Registered Page") {
                PromiseArr.push(updatePageToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updateOnceScheduleToken(NewPage["id"], NewPage["access_token"]));
                PromiseArr.push(updatePeriodScheduleToken(NewPage["id"], NewPage["access_token"]));
              }
            }
            else {
              fansPageInfo.data[i]["status"] = 'Not Enabled Page';
            }
          }
        }
        // 初始化資料
        UserBasicData.AllPageData = fansPageInfo;

        var Step1 = Q.all(PromiseArr);
        Step1.then(function () {
          return db._update(Ref, Child, UserBasicData).then(function (_Result) {
            console.log('新會員粉專資料')
            return Promise.resolve('取得Eilis新會員粉專資料成功');
          }).catch(function (err) {
            return Promise.reject('取得Eilis新會員粉專資料失敗:' + err);
          });
        }).catch(function (err) {
          res.json({ "Error": "新會員登入更新Token失敗，原因：" + err });
        });


      }
    }).catch(function (err) {
      return Promise.reject(new Error(err));
    })
  }).catch(function (err) {
    return Promise.reject(new Error(err));
  });
}

// 用戶登入時更新各個粉專在DB的PageToken，避免發送訊息/設定類的功能因Token過期無法使用
function updatePageToken(pageID, pageToken) {
  var deferred = Q.defer();
  db._onValuePromise("EilisFB", pageID)
    .then(function (_FBData) {
      if (_FBData.hasOwnProperty("PageBasicData")) {
        if (_FBData["PageBasicData"]["PageToken"] != pageToken) {
          _FBData["PageBasicData"]["PageToken"] = pageToken;
        }
      }
      if (_FBData.hasOwnProperty("ServiceSetting")) {
        var FunctionalNamesArr = Object.getOwnPropertyNames(_FBData["ServiceSetting"]);
        for (var i = 0; i < FunctionalNamesArr.length; i++) {
          var FunctionalName = FunctionalNamesArr[i];
          if (_FBData["ServiceSetting"][FunctionalName]["qs"]["access_token"] != pageToken) {
            _FBData["ServiceSetting"][FunctionalName]["qs"]["access_token"] = pageToken;
          }
        }
      }
      db._update("EilisFB", pageID, _FBData).then(function (_Data) {
        deferred.resolve("Succeed");
      }).catch(function (err) {
        deferred.reject(err);
      })
    }).catch(function (err) {
      deferred.reject(err);
    })
  return deferred.promise;
}

// 更新定時服務(一次性服務)的粉專Token
function updateOnceScheduleToken(pageID, pageToken) {
  var deferred = Q.defer();
  db._onValuePromise("EilisSchedule/Once", pageID).then(function (_OnceScheduleData) {
    if (_OnceScheduleData != null) {
      Object.keys(_OnceScheduleData).forEach(function (_Key) {
        _OnceScheduleData[_Key]["Options"]["qs"]["access_token"] = (_OnceScheduleData[_Key]["Options"]["qs"]["access_token"] == pageToken) ? _OnceScheduleData[_Key]["Options"]["qs"]["access_token"] : pageToken;
      })
      db._update("EilisSchedule/Once", pageID, _OnceScheduleData).then(function () {
        deferred.resolve("Succeed");
      }).catch(function (err) {
        deferred.reject(err);
      })
    }
    else {
      deferred.resolve("Succeed");
    }
  }).catch(function (err) {
    deferred.reject(err);
  })
  return deferred.promise;
}

// 更新定時服務(定期性服務)的粉專Token
function updatePeriodScheduleToken(pageID, pageToken) {
  var deferred = Q.defer();
  db._onValuePromise("EilisSchedule/Period", pageID).then(function (_PeriodScheduleData) {
    if (_PeriodScheduleData != null) {
      Object.keys(_PeriodScheduleData).forEach(function (_Key) {
        _PeriodScheduleData[_Key]["Options"]["qs"]["access_token"] = (_PeriodScheduleData[_Key]["Options"]["qs"]["access_token"] == pageToken) ? _PeriodScheduleData[_Key]["Options"]["qs"]["access_token"] : pageToken;
      })
      db._update("EilisSchedule/Period", pageID, _PeriodScheduleData).then(function () {
        deferred.resolve("Succeed");
      }).catch(function (err) {
        deferred.reject(err);
      })
    }
    else {
      deferred.resolve("Succeed");
    }
  }).catch(function (err) {
    deferred.reject(err);
  })
  return deferred.promise;
}

// 粉專透過FB API傳送訊息(或卡片)給用戶
function callSendAPI(messageData, pageToken) {
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
      } else {
        console.log("Successfully called Send API for recipient %s",
          recipientId);
      }
    } else {
      errorLog._ErrorLogToDB(response.error);
    }
  });
}

// 寫入用戶Email, UserID資料到表單
function updateEmailDataToSheet(sheetID, postData) {
  return new Promise((resolve, reject) => {
    request({
      uri: 'https://mavis-activity.herokuapp.com/api/writeUserEmailToSheet',
      method: 'POST',
      json: { SheetID: sheetID, PostData: postData }

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        errorLog._ErrorLogToDB(response.error);
        reject(response.error);
      }
    });
  })
}

module.exports = LoginUser;