var db = require('../../db/firebase_db.js');
var errorLog = require('../../tool/ErrorLog.js');
var requestPromise = require('request-promise');
var nodeSchedule = require('node-schedule');
var Q = require("q");

var Schedule = function (pageID, periodType, scheduleData, restMethod, postData, url, status, missionID) {
    this.pageID = pageID;
    this.periodType = periodType;
    this.scheduleData = scheduleData;
    this.restMethod = restMethod;
    this.postData = postData;
    this.url = url;
    this.status = status;
    this.missionID = missionID;
}

// 設定新排程服務
Schedule.prototype.createSchedule = function (pageID, periodType, scheduleData, restMethod, postData, url, status) {
    var Ref = "EilisFB/" + pageID;
    var ChildName = "PageBasicData";
    return db._onValuePromise(Ref, ChildName).then(function (_PageData) {
        var PageToken = _PageData.PageToken;
        var PageName = _PageData.PageName;
        var options = {
            uri: url,
            qs: { access_token: PageToken },
            headers: {
                'User-Agent': 'Request-Promise'
            },
            method: restMethod,
            json: true
        };
        if (postData != null) {
            options.body = postData;
        }
        var UpdateData = {
            "Schedule": scheduleData,
            "Options": options,
            "Status": status,
            "SettingDateTime": _dateToDBString(new Date(), "DateTime"),
            "Executed": false,
            "Edit": {
                "ScheduleData": scheduleData,
                "RESTMethod": restMethod,
                "PostData": postData,
                "Url": url,
                "Status": status
            }
        }
        Ref = "EilisSchedule/" + periodType;
        ChildName = pageID;
        return db._push(Ref, ChildName, UpdateData).then(function (_Key) {
            return Promise.resolve({ "Message": "設定 " + PageName + " 新排程服務成功", "MissionID": _Key });
        }).catch(function (err) {
            return Promise.reject({ "Error": "儲存 " + PageName + " 新排程服務設定失敗, 原因:" + err });
        })
    }).catch(function (err) {
        return Promise.reject({ "Error": "儲存 " + PageName + " 新排程服務設定失敗, 原因:" + err });
    })
}

// 取得定時服務清單
Schedule.prototype.getScheduleList = function (pageID, periodType, missionID) {
    var Ref = (missionID == "All") ? "EilisSchedule/" + periodType : "EilisSchedule/" + periodType + "/" + pageID;
    var ChildName = (missionID == "All") ? pageID : missionID;
    return db._onValuePromise(Ref, ChildName).then(function (_MissionData) {
        if (missionID == "All") {
            var ReturnDataArr = [];
            Object.keys(_MissionData).forEach(function(_Key){
                var MissionDataVal = Object.assign({}, _MissionData[_Key]["Edit"]);
                MissionDataVal["MissionID"] = _Key;
                MissionDataVal["PeriodType"] = periodType;
                ReturnDataArr.push(MissionDataVal);
            })
            return Promise.resolve(ReturnDataArr);
        }
        else {
            var ReturnData = Object.assign({}, _MissionData["Edit"]);
            ReturnData["MissionID"] = missionID;
            ReturnData["PeriodType"] = periodType;
            return Promise.resolve(ReturnData);
        }
    }).catch(function (err) {
        return Promise.reject({ "Error": "取得定時服務清單失敗, 原因:" + err });
    })
}

// 變更定時服務
Schedule.prototype.updateSchedule = function (pageID, missionID, periodType, scheduleData, restMethod, postData, url, status) {
    var Ref = "EilisSchedule/" + periodType + "/" + pageID
    var ChildName = missionID;
    return db._onValuePromise(Ref, ChildName).then(function (_MissionData) {
        var UpdateData = Object.assign({}, _MissionData);
        UpdateData.Options.body = (_MissionData.Options.body == postData) ? _MissionData.Options.body : postData;
        UpdateData.Options.uri = (_MissionData.Options.uri == url) ? _MissionData.Options.uri : url;
        UpdateData.Options.method = (_MissionData.Options.method == restMethod) ? _MissionData.Options.method : restMethod;
        UpdateData.Schedule = (_MissionData.Schedule == scheduleData) ? _MissionData.Schedule : scheduleData;
        UpdateData.Status = (_MissionData.Status == status) ? _MissionData.Status : status;
        UpdateData.SettingDateTime = _dateToDBString(new Date(), "DateTime");

        UpdateData.Edit.ScheduleData = UpdateData.Schedule;
        UpdateData.Edit.RESTMethod = UpdateData.Options.method;
        UpdateData.Edit.PostData = UpdateData.Options.body;
        UpdateData.Edit.Url = UpdateData.Options.uri;
        UpdateData.Edit.Status = UpdateData.Status;

        return db._update(Ref, ChildName, UpdateData).then(function () {
            return Promise.resolve({ "Message": "變更定時服務成功", "MissionID": missionID });
        }).catch(function (err) {
            return Promise.reject({ "Error": "變更定時服務設定失敗, 原因:" + err });
        })
    }).catch(function (err) {
        return Promise.reject({ "Error": "變更定時服務設定失敗, 原因:" + err });
    })
}

// 移除定時服務
Schedule.prototype.deleteSchedule = function (pageID, periodType, missionID) {
    var Ref = "EilisSchedule/" + periodType + "/" + pageID;
    var ChildName = missionID;
    return db._set(Ref, ChildName, {}).then(function () {
        return Promise.resolve({ "Message": "移除定時服務" + missionID + "成功" });
    }).catch(function (err) {
        return Promise.reject({ "Error": "移除定時服務失敗, 原因:" + err });
    })
}

// 掃描任務清單, 並執行任務
Schedule.prototype.scanMissions = function () {
    var Ref = "EilisSchedule";
    db._onValuePromiseWithoutChild(Ref).then(function (_ScheduleData) {
        if (_ScheduleData != null) {
            if (_ScheduleData.hasOwnProperty("Once")) {
                Object.keys(_ScheduleData.Once).forEach(function (pageID) {
                    Object.keys(_ScheduleData.Once[pageID]).forEach(function (key) {
                        var Status = _ScheduleData.Once[pageID][key]["Status"];
                        // 執行狀態為On
                        if (Status == "On") {
                            var DatetimeSetting = new Date(_ScheduleData.Once[pageID][key]["Schedule"]["DateTime"]);
                            var DateNow = new Date(Date.now());
                            // 觸發排程時間小於等於目前時間的單次任務
                            if (DateNow >= DatetimeSetting) {
                                var Options = _ScheduleData.Once[pageID][key]["Options"];
                                triggerAPIRequest(Options).then(function () {
                                    var UpdateData = {
                                        "Status": "Off",
                                        "Executed": true,
                                        "LastExecutedAt": _dateToDBString(new Date(), "DateTime")
                                    }
                                    db._update("EilisSchedule/Once/" + pageID, key, UpdateData).then(function () {
                                        console.log("已完成 " + pageID + " 單次排程任務: " + key);
                                    })
                                }).catch(function (err) {
                                    errorLog._ErrorLogToDB("粉專ID " + pageID + " 單次排程任務 " + key + " 失敗, 原因:" + err);
                                });
                            }
                        }
                    })
                })
            }
            if (_ScheduleData.hasOwnProperty("Period")) {
                Object.keys(_ScheduleData.Period).forEach(function (pageID) {
                    Object.keys(_ScheduleData.Period[pageID]).forEach(function (key) {
                        var Status = _ScheduleData.Period[pageID][key]["Status"];
                        var ExecutedToday = (!_ScheduleData.Period[pageID][key].hasOwnProperty("LastExecutedAt")) ? false : (_ScheduleData.Period[pageID][key]["LastExecutedAt"].split(' ')[0] == _dateToDBString(new Date(), "Date")) ? true : false;
                        // 執行狀態為On, 本日尚未執行的排程任務
                        if (Status == "On" && ExecutedToday == false) {
                            var WeekDaysSetting = _ScheduleData.Period[pageID][key]["Schedule"]["DayOfWeek"];
                            var WeekDayToday = (new Date(Date.now()).getDay() == 0) ? 7 : new Date(Date.now()).getDay();
                            // 知道今天為星期幾後, 確認今日為本週執行日
                            if (WeekDaysSetting.indexOf(WeekDayToday) != -1) {
                                var DatetimeSetting = new Date(_dateToDBString(new Date(), "Date") + " " + _ScheduleData.Period[pageID][key]["Schedule"]["Time"]);
                                var DateNow = new Date(Date.now());
                                // 觸發排程時間小於等於目前時間的排程任務
                                if (DateNow >= DatetimeSetting) {
                                    var Options = _ScheduleData.Period[pageID][key]["Options"];
                                    triggerAPIRequest(Options).then(function () {
                                        var UpdateData = {
                                            "Executed": true,
                                            "LastExecutedAt": _dateToDBString(new Date(), "DateTime")
                                        }
                                        db._update("EilisSchedule/Period/" + pageID, key, UpdateData).then(function () {
                                            console.log("已完成 " + pageID + " 週期排程任務: " + key);
                                        })
                                    }).catch(function (err) {
                                        errorLog._ErrorLogToDB("粉專ID " + pageID + " 週期排程任務 " + key + " 失敗, 原因:" + err);
                                    });
                                }
                            }
                        }
                    })
                })
            }
        }
    })
}

// 呼叫API
var triggerAPIRequest = function (options) {
    var deferred = Q.defer();
    requestPromise(options).then(function (parsedBody) {
        deferred.resolve("Succeed");
    }).catch(function (err) {
        deferred.reject("排程功能失敗, 原因:" + err);
    });
    return deferred.promise;
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

module.exports = Schedule;