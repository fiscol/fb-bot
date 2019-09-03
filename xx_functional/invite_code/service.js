var db = require('../../db/firebase_db.js');
var crypto = require('crypto');

//註冊服務後產生邀請碼, 寫入DB, 之後不會更動(in:會員ID, out:邀請碼)
exports._GenInviteCode = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        // 檢查是否已註冊
        var RefPath = "EilisUser";
        var ChildName = UserID;
        db._onValuePromise(RefPath, ChildName).then(function (_RegisteredData) {
            // 未註冊
            if (_RegisteredData == null) {
                res.json({ "Error": "使用者尚未完成註冊" });
            }
            else {
                // 檢查是否已有邀請碼
                RefPath = "EilisUser/" + UserID + "/TradeInfo";
                ChildName = "InviteCode";
                db._onValuePromise(RefPath, ChildName).then(function (_InviteCode) {
                    // 已有邀請碼, 直接回傳
                    if (_InviteCode != null) {
                        res.json({ "InviteCode": _InviteCode });
                    }
                    // 沒有邀請碼
                    else {
                        //產製5碼隨機碼
                        var InviteCode = _genInviteCode();
                        //到DB檢查是否已存在該組邀請碼
                        checkInviteCodeInDB(UserID, InviteCode).then(function () {
                            // 沒有重複，存入DB
                            RefPath = "EilisUser/" + UserID;
                            ChildName = "TradeInfo";
                            var Data = {
                                "InviteCode": InviteCode
                            };
                            // 存到DB
                            db._update(RefPath, ChildName, Data).then(function (_Result) {
                                // 回傳邀請碼
                                res.json({ "InviteCode": InviteCode });
                            }).catch(function (err) {
                                res.json({ "Error": "產製邀請碼出現錯誤, 原因:" + err });
                            });
                        })
                    }
                }).catch(function (err) {
                    res.json({ "Error": "產製邀請碼出現錯誤, 原因:" + err });
                });
            }
        }).catch(function (err) {
            res.json({ "Error": "產製邀請碼出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入會員ID" });
    }
}

//取得邀請碼(in:會員ID, out:邀請碼)
exports._ReturnInviteCode = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        // DB Path
        var RefPath = "EilisUser/" + UserID + "/TradeInfo";
        // Child Name
        var ChildName = "InviteCode";
        // 回傳邀請碼
        db._onValuePromise(RefPath, ChildName).then(function (_InviteCode) {
            // 已有邀請碼, 直接回傳
            if (_InviteCode != null) {
                res.json({ "InviteCode": _InviteCode });
            }
            // 沒有邀請碼, 回傳錯誤
            else {
                res.json({ "Error": "取得邀請碼出現錯誤, 原因:找不到邀請碼" });
            }
        }).catch(function (err) {
            res.json({ "Error": "取得邀請碼出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入會員ID" });
    }
}

//取得粉絲頁服務類型(哪種付費或免費)(in:會員ID, 粉絲頁ID out:會員類型)
exports._GetMemberType = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        // DB Path
        var RefPath = "EilisUser/" + UserID + "/ProductInfo";
        // Child Name
        var ChildName = "ProductLevel";
        // 回傳會員類型
        db._onValuePromise(RefPath, ChildName).then(function (_ProductLevel) {
            // 已有會員類型, 直接回傳
            if (_ProductLevel != null) {
                res.json({ "ProductLevel": _ProductLevel });
            }
            // 沒有會員類型, 回傳錯誤
            else {
                res.json({ "Error": "取得會員類型出現錯誤, 原因:找不到會員類型" });
            }
        }).catch(function (err) {
            res.json({ "Error": "取得會員類型出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入會員ID與粉絲頁ID" });
    }
}

//邀請碼被啟用, 原邀請者可使用天數+(in:邀請碼, out:完成訊息, 這邊可以考慮用socket或信件通知原邀請者)
exports._InviteCodeRegistered = function (req, res) {
    var _InviteCode = req.body.InviteCode;
    var _InvitedID = req.body.InvitedID;
    if (_InviteCode && _InvitedID) {
        // 檢查此受邀請者是否已完成註冊
        var RefPath = "EilisUser";
        var ChildName = _InvitedID;
        return db._onValuePromise(RefPath, ChildName).then(function (_RegisteredData) {
            // 未註冊
            if (_RegisteredData == null) {
                res.json({ "Error": "受邀請者尚未完成註冊" });
            }
            // 已註冊
            else {
                // 確認是否為活動邀請碼
                RefPath = "EilisData/SpecialBonusActivity";
                ChildName = "SpecialBonusCode";
                db._equalTo(RefPath, ChildName, _InviteCode, null).then(function (_ActivityData) {
                    // 找到活動
                    if (_ActivityData != null) {
                        // 取得活動ID與活動期限，優惠天數
                        var ActivityID = Object.keys(_ActivityData)[0];
                        var BonusDays = _ActivityData[ActivityID]["SpecialBonusDay"];
                        var StartDate = _DBStringToDate(_ActivityData[ActivityID]["SpecialBonusStartTime"]);
                        var DeadLine = _DBStringToDate(_ActivityData[ActivityID]["SpecialBonusDeadline"]);
                        var DateNow = new Date();
                        // 檢查優惠是否在活動期限內
                        if (DateNow >= StartDate && DeadLine >= DateNow) {
                            // 檢查使用者是否已註冊本優惠
                            RefPath = "EilisData/SpecialBonusActivity/" + ActivityID + "/SpecialBonusUser";
                            ChildName = _InvitedID;
                            db._onValuePromise(RefPath, ChildName).then(function (_RegisteredData) {
                                // 已註冊，回傳訊息
                                if (_RegisteredData != null) {
                                    res.json({ "Error": "您已註冊此優惠囉。" });
                                }
                                //尚未註冊
                                else {
                                    // 在活動中加入使用者已註冊優惠的紀錄
                                    RefPath = "EilisData/SpecialBonusActivity/" + ActivityID + "/SpecialBonusUser";
                                    ChildName = _InvitedID;
                                    var Data = {
                                        "SpecialBonusActiveTime": _dateToDBString(DateNow, "DateTime")
                                    };
                                    // 存到DB
                                    db._update(RefPath, ChildName, Data).then(function (_Result) {
                                        // 取得使用者下次付款日
                                        RefPath = "EilisUser/" + _InvitedID;
                                        ChildName = "TradeInfo";
                                        db._onValuePromise(RefPath, ChildName).then(function (_TradeInfo) {
                                            var NewPayDate = _dateToDBString(_addDays(new Date(_TradeInfo["NextPayDate"]), BonusDays), "Date");
                                            var NewInformDate = _dateToDBString(_addDays(new Date(_TradeInfo["NextInformDate"]), BonusDays), "Date");
                                            // 更新使用者優惠天數
                                            var UpdateData = {
                                                "NextPayDate": NewPayDate,
                                                "NextInformDate": NewInformDate
                                            }
                                            db._update(RefPath, ChildName, UpdateData).then(function () {
                                                res.json({ "Message": "已增加邀請者 " + _InvitedID + " 優惠天數 " + BonusDays + " 天" });
                                            }).catch(function (err) {
                                                res.json({ "Error": "更新下次付款日期出現錯誤, 原因:" + err });
                                            })
                                        }).catch(function (err) {
                                            res.json({ "Error": "取得下次付款日期出現錯誤, 原因:" + err });
                                        })
                                    }).catch(function (err) {
                                        res.json({ "Error": "啟用邀請碼出現錯誤, 原因:" + err });
                                    });
                                }
                            })
                        }
                        else {
                            // 回傳活動上線時間的提示
                            if (DateNow < StartDate) {
                                res.json({ "Error": "本活動將在" + _dateToDBString(StartDate, "Date") + "開始，歡迎您屆時使用本優惠!!" });
                            }
                            // 回傳活動已過期的提示
                            if (DateNow > DeadLine) {
                                res.json({ "Error": "本活動已於" + _dateToDBString(DeadLine, "Date") + "結束囉!!" });
                            }
                        }
                    }
                    // 確認是否為個人邀請碼
                    else {
                        // 確認是否為個人邀請碼
                        RefPath = "EilisUser";
                        ChildName = "TradeInfo/InviteCode"
                        db._equalTo(RefPath, ChildName, _InviteCode, null).then(function (_UserData) {
                            // 找到原邀請者
                            if (_UserData != null) {
                                // 取得原邀請者ID
                                var UserID = Object.keys(_UserData)[0];
                                // 邀請碼不是本人自己的
                                if (UserID != _InvitedID) {
                                    var AlreadyInvited = false;
                                    var InvitedUsers = "";
                                    // 確認優惠碼是否已使用
                                    if (_UserData[UserID]["TradeInfo"].hasOwnProperty("InvitedUsers")) {
                                        InvitedUsers = _UserData[UserID]["TradeInfo"]["InvitedUsers"];
                                        // 受邀請者已有使用紀錄
                                        if (InvitedUsers.indexOf(_InvitedID) != -1) {
                                            AlreadyInvited = true;
                                            res.json({ "Error": "此優惠碼您已經使用過囉!" });
                                        }
                                        // 目前已有其他使用此優惠碼的用戶
                                        else {
                                            InvitedUsers += "," + _InvitedID;
                                        }
                                    }
                                    // 目前沒有使用此優惠碼的用戶
                                    else {
                                        InvitedUsers = _InvitedID;
                                    }
                                    // 受邀請者沒有使用過這組邀請碼
                                    if (AlreadyInvited == false) {
                                        // 更新已被邀請的清單
                                        RefPath = "EilisUser/" + UserID;
                                        ChildName = "TradeInfo";
                                        var Data = {
                                            "InvitedUsers": InvitedUsers
                                        };
                                        db._update(RefPath, ChildName, Data);
                                        // 更新原邀請者優惠天數，回傳成功訊息
                                        // 取得使用者下次付款日
                                        RefPath = "EilisUser/" + UserID;
                                        ChildName = "TradeInfo";
                                        db._onValuePromise(RefPath, ChildName).then(function (_TradeInfo) {
                                            var AddCount = 1;
                                            var NewPayDate = _dateToDBString(_addDays(new Date(_TradeInfo["NextPayDate"]), AddCount), "Date");
                                            var NewInformDate = _dateToDBString(_addDays(new Date(_TradeInfo["NextInformDate"]), AddCount), "Date");
                                            // 更新使用者優惠天數
                                            var UpdateData = {
                                                "NextPayDate": NewPayDate,
                                                "NextInformDate": NewInformDate
                                            }
                                            db._update(RefPath, ChildName, UpdateData).then(function () {
                                                res.json({ "Message": "已增加邀請者 " + UserID + " 優惠天數 " + AddCount + " 天" });
                                            }).catch(function (err) {
                                                res.json({ "Error": "更新下次付款日期出現錯誤, 原因:" + err });
                                            })
                                        }).catch(function (err) {
                                            res.json({ "Error": "取得下次付款日期出現錯誤, 原因:" + err });
                                        })
                                    }
                                }
                                // 邀請碼是本人自己的，無效
                                else {
                                    res.json({ "Error": "此優惠碼只適用於推薦給您的好友喔!" });
                                }
                            }
                            // 沒有對應的邀請者，邀請碼有誤
                            else {
                                res.json({ "Error": "啟用邀請碼出現錯誤, 原因:本組邀請碼無效，找不到對應的邀請者" });
                            }
                        }).catch(function (err) {
                            res.json({ "Error": "啟用邀請碼出現錯誤, 原因:" + err });
                        });
                    }
                }).catch(function (err) {
                    res.json({ "Error": "啟用邀請碼出現錯誤, 原因:" + err });
                });
            }
        }).catch(function (err) {
            res.json({ "Error": "啟用邀請碼出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入邀請碼與受邀請者ID" });
    }
}

//取得整包會員資料(含邀請碼, 會員類型為哪種付費或免費, 系統可使用天數)(in:會員ID, out:所有資訊, 除了密碼)
exports._GetMemberDataAll = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        // DB Path
        var RefPath = "EilisUser";
        // Child Name
        var ChildName = UserID;
        // 回傳會員資料
        db._onValuePromise(RefPath, ChildName).then(function (_MemberData) {
            // 已有會員資料, 直接回傳
            if (_MemberData != null) {
                res.json({ "MemberData": _MemberData });
            }
            // 沒有會員資料, 回傳錯誤
            else {
                res.json({ "Error": "取得會員資料出現錯誤, 原因:找不到會員資料" });
            }
        }).catch(function (err) {
            res.json({ "Error": "取得會員資料出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入會員ID" });
    }
}

// 檢查資料庫其他使用者是否有重複的邀請碼，若已重複則重新產製一組
function checkInviteCodeInDB(_UserID, _InviteCode) {
    var RefPath = "EilisUser/" + _UserID;
    var ChildName = "TradeInfo/InviteCode"
    return new Promise((resolve, reject) => {
        db._equalTo(RefPath, ChildName, _InviteCode, null).then(function (_Code) {
            if (_Code == null) {
                return resolve("ok");
            }
            else {
                var newInviteCode = _genInviteCode();
                checkInviteCodeInDB(_UserID, newInviteCode);
            }
        }).catch(function (err) {
            return resolve("ok");
        })
    });
}

//產製5碼隨機碼
var _genInviteCode = function () {
    return _randomAsciiString(5);
}

var _randomString = function (length, chars) {
    if (!chars) {
        throw new Error('Argument \'chars\' is undefined');
    }

    var charsLength = chars.length;
    if (charsLength > 256) {
        throw new Error('Argument \'chars\' should not have more than 256 characters'
            + ', otherwise unpredictability will be broken');
    }

    var randomBytes = crypto.randomBytes(length);
    var result = new Array(length);

    var cursor = 0;
    for (var i = 0; i < length; i++) {
        cursor += randomBytes[i];
        result[i] = chars[cursor % charsLength];
    }

    return result.join('');
}

var _randomAsciiString = function (length) {
    return _randomString(length,
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
}

function _addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

//DB日期字串轉日期格式
var _DBStringToDate = function (_Input) {
    _Input = _Input.split("/").join("-");
    var Pos = _Input.lastIndexOf(' ');
    _Input = _Input.substring(0, Pos) + "T" + _Input.substring(Pos + 1) + "Z";
    var Dt = new Date(_Input);
    return Dt;
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