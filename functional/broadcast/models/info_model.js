var db = require('../../../db/firebase_db.js');
const errorLog = require('../../../tool/ErrorLog.js');
var requestPromise = require('request-promise');

var Info = function (userID, pageID, tag) {
    this.userID = userID;
    this.pageID = pageID;
    this.tag = tag;
}

Info.prototype.getBroadcastDetail = function (userID, pageID, tag) {
    return new Promise((resolve, reject) => {
        var BroadcastData = {
            "TotalRecipients": 0,
            "MonthlyQuota": 0
        };
        db._onValuePromise("EilisPSID/" + pageID, "UserCount").then(function (_UserCountData) {
            if (_UserCountData != null) {
                if (tag == null) {
                    BroadcastData.TotalRecipients = _UserCountData["GeneralSender"];
                }
                else {
                    BroadcastData.TotalRecipients = (_UserCountData.hasOwnProperty(tag)) ? _UserCountData[tag] : 0;
                }
            }
            //確認目前查詢粉專是主管理者 / 共用管理者
            db._onValuePromise("EilisFB/" + pageID, "PageBasicData").then(function (_PageBasicData) {
                if (_PageBasicData != null) {
                    var AdminID = _PageBasicData["PageAdmin"]["UserID"];
                    var UserRole = "Not authorized";
                    if (AdminID == userID) {
                        UserRole = "Admin";
                    }
                    else if (_PageBasicData.hasOwnProperty("PageEditor")) {
                        _PageBasicData.PageEditor.map(function (_EditorData, _Index) {
                            if (_EditorData.UserID == userID) {
                                UserRole = "Editor";
                            }
                        })
                    }
                    if (UserRole != "Not authorized") {
                        //廣播當月剩餘數量
                        db._onValuePromise("EilisUser/" + AdminID + "/ProductInfo", "ProductFunction").then(function (_FunctionData) {
                            if (_FunctionData.hasOwnProperty("EilisBroadcastLimit")) {
                                BroadcastData.MonthlyQuota = _FunctionData["EilisBroadcastLimit"];
                            }
                            if (_FunctionData.hasOwnProperty("EilisBonusLimit")) {
                                BroadcastData.BonusQuota = _FunctionData["EilisBonusLimit"];
                            }
                            return resolve(BroadcastData);
                        }).catch(function (err) {
                            return reject({ "Error": "取得廣播當月剩餘數量失敗, 原因:" + err });
                        })
                    }
                    else{
                        return reject({ "Error": "取得廣播當月剩餘數量失敗, 原因:查詢的用戶ID並無此粉專管理/共同管理權限" });
                    }
                }
                else{
                    return reject({ "Error": "取得廣播當月剩餘數量失敗, 原因:找不到查詢的粉專" });
                }
            }).catch(function (err) {
                return reject({ "Error": "取得廣播對象人數失敗, 原因:" + err });
            })
        }).catch(function (err) {
            return reject({ "Error": "取得廣播對象人數失敗, 原因:" + err });
        })
    })
}

module.exports = Info;