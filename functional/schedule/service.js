var Schedule = require('./model.js');
var db = require('../../db/firebase_db.js');
var errorLog = require('../../tool/ErrorLog.js');
var Q = require("q");
const FB = require('fb');
const request = require('request');

// 掃描任務清單, 並執行任務
exports._ScanMissions = function () {
    var schedule = new Schedule(null, null, null, null, null, null, null);
    schedule.scanMissions();
}

// 設定新定時服務
exports._CreateSchedule = function (req, res) {
    var PageID = req.body.PageID;
    var PeriodType = req.body.PeriodType;
    var ScheduleData = req.body.ScheduleData;
    var RESTMethod = req.body.RESTMethod;
    var PostData = req.body.PostData;
    var Url = req.body.Url;
    var Status = req.body.Status;
    if (PageID && PeriodType && ScheduleData && RESTMethod && Url && Status) {
        if (PeriodType == "Period" || PeriodType == "Once") {
            var schedule = new Schedule(PageID, PeriodType, ScheduleData, RESTMethod, null, Url, Status, null);
            schedule.postData = (PostData == null) ? null : PostData;
            schedule.createSchedule(schedule.pageID, schedule.periodType, schedule.scheduleData, schedule.restMethod, schedule.postData, schedule.url, schedule.status).then(function (_Result) {
                res.json(_Result);
            }).catch(function (err) {
                res.json({ "Error": "設定新定時服務出現錯誤, 原因:" + err });
            })
        }
        else {
            res.json({ "Error": "未傳入對應參數" });
        }
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 取得定時服務清單
exports._GetScheduleList = function (req, res) {
    var PageID = req.body.PageID;
    var PeriodType = req.body.PeriodType;
    var MissionID = req.body.MissionID;
    if (PageID && PeriodType && MissionID) {
        if (PeriodType == "Period" || PeriodType == "Once") {
            var schedule = new Schedule(PageID, PeriodType, null, null, null, null, null, MissionID);
            schedule.getScheduleList(schedule.pageID, schedule.periodType, schedule.missionID).then(function (_Result) {
                res.json(_Result);
            }).catch(function (err) {
                res.json({ "Error": "取得定時服務出現錯誤, 原因:" + err });
            })
        }
        else {
            res.json({ "Error": "未傳入對應參數" });
        }
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 變更定時服務
exports._UpdateSchedule = function (req, res) {
    var PageID = req.body.PageID;
    var PeriodType = req.body.PeriodType;
    var ScheduleData = req.body.ScheduleData;
    var RESTMethod = req.body.RESTMethod;
    var PostData = req.body.PostData;
    var Url = req.body.Url;
    var Status = req.body.Status;
    var MissionID = req.body.MissionID;
    if (PageID && PeriodType && ScheduleData && RESTMethod && Url && Status && MissionID) {
        if (PeriodType == "Period" || PeriodType == "Once") {
            var schedule = new Schedule(PageID, PeriodType, ScheduleData, RESTMethod, null, Url, Status, MissionID);
            schedule.postData = (PostData == null) ? null : PostData;
            schedule.updateSchedule(schedule.pageID, schedule.missionID, schedule.periodType, schedule.scheduleData, schedule.restMethod, schedule.postData, schedule.url, schedule.status).then(function (_Result) {
                res.json(_Result);
            }).catch(function (err) {
                res.json({ "Error": "變更定時服務出現錯誤, 原因:" + err });
            })
        }
        else {
            res.json({ "Error": "未傳入對應參數" });
        }
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 移除定時服務
exports._DeleteSchedule = function (req, res) {
    var PageID = req.body.PageID;
    var PeriodType = req.body.PeriodType;
    var MissionID = req.body.MissionID;
    if (PageID && PeriodType && MissionID) {
        if (PeriodType == "Period" || PeriodType == "Once") {
            var schedule = new Schedule(PageID, PeriodType, null, null, null, null, null, MissionID);
            schedule.deleteSchedule(schedule.pageID, schedule.periodType, schedule.missionID).then(function (_Result) {
                res.json(_Result);
            }).catch(function (err) {
                res.json({ "Error": "移除定時服務出現錯誤, 原因:" + err });
            })
        }
        else {
            res.json({ "Error": "未傳入對應參數" });
        }
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 檢查單一粉專Token
exports._DebugPageToken = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageBasicData) {
            if (_PageBasicData != null) {
                var PageName = _PageBasicData["PageName"];
                var AdminName = _PageBasicData["PageAdmin"]["UserName"];
                Q.all([debugToken(PageID, PageName, AdminName, 0, _PageBasicData["PageToken"])]).then(function (_result) {
                    res.json(_result[0]);
                }).catch(function (err) {
                    res.json({ "Message": "粉專Token權限查詢功能失敗, 原因:" + err });
                })
            }
            else {
                res.json({ "Message": "粉專Token權限查詢功能失敗, 原因:找不到相關的Eilis粉專設定" });
            }
        }).catch(function (err) {
            res.json({ "Message": "粉專Token權限查詢功能失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

// 檢查所有粉專Token
exports._DebugAllTokenAPI = function (req, res) {
    db._onValuePromiseWithoutChild("EilisFB").then(function (_PageData) {
        var PageIDArr = Object.getOwnPropertyNames(_PageData);
        var PromiseArr = [];
        PageIDArr.map(function (_PageID, _Index) {
            if (_PageData[_PageID].hasOwnProperty("PageBasicData")) {
                var PageName = _PageData[_PageID]["PageBasicData"]["PageName"];
                var AdminName = _PageData[_PageID]["PageBasicData"]["PageAdmin"]["UserName"];
                PromiseArr.push(debugToken(_PageID, PageName, AdminName, _Index, _PageData[_PageID]["PageBasicData"]["PageToken"]));
            }
        })

        Q.all(PromiseArr).then(function (_result) {
            res.send(_result);
        })
    })
}

// 每小時自動掃瞄所有粉專token狀況
exports._DebugAllToken = function () {
    db._onValuePromiseWithoutChild("EilisFB").then(function (_PageData) {
        var PageIDArr = Object.getOwnPropertyNames(_PageData);
        var PromiseArr = [];
        PageIDArr.map(function (_PageID, _Index) {
            if (_PageData[_PageID].hasOwnProperty("PageBasicData")) {
                var PageName = _PageData[_PageID]["PageBasicData"]["PageName"];
                var AdminName = _PageData[_PageID]["PageBasicData"]["PageAdmin"]["UserName"];
                PromiseArr.push(debugToken(_PageID, PageName, AdminName, _Index, _PageData[_PageID]["PageBasicData"]["PageToken"]));
            }
        })

        Q.all(PromiseArr).then(function (_result) {
            console.log(_result);
        })
    })
}

// 取得粉專Token狀態
function debugToken(pageID, pageName, adminName, index, pageToken) {
    var deferred = Q.defer();
    // 避免同時傳送需求到FB，分流成每3秒傳送100組Request
    setTimeout(function () {
        FB.api('oauth/access_token', {
            client_id: FB.options('appId'),
            client_secret: FB.options('appSecret'),
            grant_type: 'client_credentials'
        }, function (res) {
            var AppToken = res.access_token;
            FB.setAccessToken(AppToken);
            FB.api(
                "/debug_token?input_token=" + pageToken,
                "GET",
                function (response) {
                    if (response && !response.error) {
                        response.data.page_id = pageID;
                        response.data.page_name = pageName;
                        response.data.admin_name = adminName;
                        // 粉專權限正常
                        if (response.data.is_valid == true) {
                            updateTokenStatus(pageID, pageName, adminName, "OK", null).then(function () {
                                deferred.resolve({ "Message": "粉專'" + pageName + "'Token權限正常" });
                            }).catch(function (err) {
                                deferred.reject({ "Error": "粉專'" + pageName + "'Token權限正常, 但更新狀態到資料庫失敗, 原因:" + err });
                            });
                        }
                        // 粉專權限出現問題
                        else {
                            response.data.error.message = (response.data.error.message == "Error validating access token: The session has been invalidated because the user changed their password or Facebook has changed the session for security reasons.") ? "管理人員更換密碼或FB安全性鎖定。" : response.data.error.message;
                            response.data.error.message = (response.data.error.message == "Error validating access token: The user has not authorized application 1680525215574533.") ? "用戶已移除Eilis應用程式。" : response.data.error.message;
                            console.error("粉專'" + pageName + "'Token權限不足，原因:" + response.data.error.message);
                            updateTokenStatus(pageID, pageName, adminName, "Error", response.data.error.message).then(function () {
                                deferred.resolve({ "Message": "粉專'" + pageName + "'Token權限不足, 原因:" + response.data.error.message });
                            }).catch(function (err) {
                                deferred.reject({ "Error": "粉專'" + pageName + "'Token權限正常, 但更新狀態到資料庫失敗, 原因:" + err });
                            });
                        }
                    }
                    // 可能是粉專已刪除（但也有可能是FB端的Request失敗，粉專正常運作）
                    else {
                        response.error.page_id = pageID;
                        response.error.page_name = pageName;
                        response.error.admin_name = adminName;
                        response.error.message = (response.error.message == "getaddrinfo ENOTFOUND graph.facebook.com graph.facebook.com:443") ? "傳送至FB的確認需求失敗。" : response.error.message;
                        response.error.message = (response.error.message == "Unsupported get request.") ? "該粉專可能已經被移除。" : response.error.message;
                        console.error("粉專'" + pageName + "'Token權限異常，原因:" + response.error.message);
                        updateTokenStatus(pageID, pageName, adminName, "Failed", response.error.message).then(function () {
                            deferred.resolve({ "Message": "粉專'" + pageName + "'Token權限異常, 原因:" + response.error.message });
                        }).catch(function (err) {
                            deferred.reject({ "Error": "粉專'" + pageName + "'Token權限正常, 但更新狀態到資料庫失敗, 原因:" + err });
                        });
                    }
                }
            );
        });
    }, 3000 * parseInt(index / 100, 10));


    return deferred.promise;
}

function updateTokenStatus(pageID, pageName, adminName, status, errMessage) {
    var deferred = Q.defer();
    var Status = {
        TokenStatus: status
    }
    var InformEilisAdmin = false;
    db._onValuePromise("EilisFB/" + pageID, "PageBasicData").then(function (_PageBasicData) {
        if (_PageBasicData != null) {
            if (_PageBasicData.hasOwnProperty("TokenStatus") && _PageBasicData["TokenStatus"] == "OK" && status == "Error" && errMessage) {
                InformEilisAdmin = true;
            }
        }
        db._update("EilisFB/" + pageID, "PageBasicData", Status).then(function () {
            if (InformEilisAdmin == true) {
                errorLog._ErrorLogToDB("粉專'" + pageName + "'Token權限不足，原因:" + errMessage);
                SendMessageToEilisAdmin(pageName, adminName, errMessage).then(function () {
                    deferred.resolve("Updated.");
                }).catch(function (err) {
                    deferred.reject("Error:" + err);
                })
            }
            else {
                deferred.resolve("Updated.");
            }
        }).catch(function (err) {
            deferred.reject("Error:" + err);
        })
    }).catch(function (err) {
        deferred.reject("Error:" + err);
    })

    return deferred.promise;
}

// 通知Eilis粉專管理員
function SendMessageToEilisAdmin(pageName, adminName, errMessage) {
    var deferred = Q.defer();
    db._onValuePromise("EilisFB", "948751308600303").then(function (_EilisPageData) {
        var PageToken = _EilisPageData.PageBasicData.PageToken;
        var InformMessage = "用戶 '" + adminName + "' 管理的粉專 '" + pageName + "' Token失效囉，失效原因為: " + errMessage + " 麻煩聯繫該粉專人員協助確認，謝謝!";
        var PayloadData = {
            recipient: {
                id: "1689665624441748" // 目前預設會通知 "Eilis AI" 的帳號
            },
            message: {
                text: InformMessage,
                metadata: "DEVELOPER_DEFINED_METADATA"
            }
        }
        callSendAPI(PayloadData, PageToken).then(function () {
            deferred.resolve("OK.");
        });
    })
    return deferred.promise;
}

function callSendAPI(messageData, pageToken) {
    var deferred = Q.defer();
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: pageToken },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
            deferred.resolve("OK.");
        } else {
            errorLog._ErrorLogToDB(response.error);
        }
    });
    return deferred.promise;
}