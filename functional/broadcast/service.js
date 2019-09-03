var db = require('../../db/firebase_db.js');
var Receiver = require('./models/receiver_model.js');
var Info = require('./models/info_model.js');
var Photo = require('../upload_file/models/photo_model.js');

//廣播文字功能
exports._BroadcastMessage = function (req, res) {
    //確認文字長度
    //取得DB的粉絲專頁資料
    //確認本月剩餘可發送廣播數, 與Sender * 則數比較
    //取得PageToken
    //對GeneralSender廣播
    var pageID = req.body.PageID;
    var message = req.body.Message;
    var tag = req.body.Tag;
    var reply = req.body.Reply;
    if (pageID && message) {
        //確認文字長度
        if (message.replace(" ", "").length <= 200 && message.replace(" ", "").length != 0) {
            //取得DB的粉絲專頁資料
            db._onValuePromise("EilisPSID", pageID).then(function (_PSIDData) {
                if (_PSIDData != null) {
                    if (!_PSIDData.hasOwnProperty("SenderData")) {
                        res.json({ "Error": "您的粉專還沒有近期互動過的用戶喔!" });
                    }
                    var datetime = _dateToDBString(new Date(), "DateTime");
                    var messageContent = {
                        text: message,
                        metadata: "DEVELOPER_DEFINED_METADATA"
                    };
                    db._onValuePromise("EilisFB", pageID).then(function (_FBData) {
                        if (_FBData.hasOwnProperty("EilisUI")) {
                            if (_FBData["EilisUI"].hasOwnProperty("Menu")) {
                                if (reply == null) {
                                    cardContent["quick_replies"] = _FBData.EilisUI.Menu["公版主選單"].content.quick_replies;
                                }
                                else {
                                    reply = HalfWidthToFullWidth(reply);
                                    cardContent["quick_replies"] = _FBData.EilisUI.Menu[reply].content.quick_replies;
                                }
                            }
                        }
                        //取得PageToken
                        var pageToken = _FBData["PageBasicData"]["PageToken"];
                        var pageName = _FBData["PageBasicData"]["PageName"];
                        //確認本月剩餘可發送廣播數, 與Sender * 則數比較
                        var adminID = _FBData["PageBasicData"]["PageAdmin"]["UserID"];
                        var Ref = "EilisUser/" + adminID + "/ProductInfo";
                        var ChildName = "ProductFunction";
                        db._onValuePromise(Ref, ChildName).then(function (_ProductData) {
                            var broadcastLimit = (_ProductData["EilisBroadcastLimit"] >= 0) ? _ProductData["EilisBroadcastLimit"] : 0;
                            if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                                broadcastLimit += _ProductData["EilisBonusLimit"];
                            }
                            // 若有傳入Tag, 則確認符合Tag的互動用戶清單
                            // 沒有傳入Tag, 就直接發送給所有互動用戶
                            var allRecipientIDArr = [];
                            if (tag == null) {
                                Object.keys(_PSIDData["SenderData"]["GeneralSender"]).forEach(function (_PSID) {
                                    if (_PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("BlackList") == -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("Unsubscribed") == -1) {
                                        allRecipientIDArr.push(_PSID);
                                    }
                                })
                            }
                            else {
                                Object.keys(_PSIDData["SenderData"]["GeneralSender"]).forEach(function (_PSID) {
                                    if (_PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf(tag) != -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("BlackList") == -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("Unsubscribed") == -1) {
                                        allRecipientIDArr.push(_PSID);
                                    }
                                })
                            }
                            var totalRecipient = allRecipientIDArr.length;
                            if (broadcastLimit >= totalRecipient && totalRecipient != 0) {
                                setBroadcastRecordToDB(pageName, datetime, totalRecipient, messageContent).then(function (_DBKey) {
                                    // 傳送廣播卡片給專頁粉絲
                                    for (order = 0; order < totalRecipient; order++) {
                                        var receiver = new Receiver(adminID, pageName, allRecipientIDArr[order], pageToken, messageContent, _DBKey, order, totalRecipient);
                                    }
                                    var broadcastData = {
                                        "EilisBroadcastLimit": _ProductData["EilisBroadcastLimit"] - totalRecipient
                                    }
                                    if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                                        broadcastData = {
                                            "EilisBroadcastLimit": (_ProductData["EilisBroadcastLimit"] - totalRecipient >= 0) ? _ProductData["EilisBroadcastLimit"] - totalRecipient : (_ProductData["EilisBroadcastLimit"] < 0) ? _ProductData["EilisBroadcastLimit"] : 0,
                                            "EilisBonusLimit": (_ProductData["EilisBroadcastLimit"] - totalRecipient >= 0) ? _ProductData["EilisBonusLimit"] : (_ProductData["EilisBroadcastLimit"] > 0) ? _ProductData["EilisBonusLimit"] - (totalRecipient - _ProductData["EilisBroadcastLimit"]) : _ProductData["EilisBonusLimit"] - totalRecipient
                                        }
                                    }
                                    // 更新廣播餘額
                                    db._update(Ref, ChildName, broadcastData).then(function () {
                                        // 設定完後結束Request, 不等全部廣播執行完。
                                        if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                                            res.json({
                                                "Message": "廣播訊息設定完成",
                                                "TotalRecipients": totalRecipient,
                                                "MonthlyQuota": broadcastData.EilisBroadcastLimit,
                                                "BonusQuota": broadcastData.EilisBonusLimit
                                            });
                                        }
                                        else {
                                            res.json({
                                                "Message": "廣播訊息設定完成",
                                                "TotalRecipients": totalRecipient,
                                                "MonthlyQuota": broadcastLimit - totalRecipient
                                            });
                                        }
                                    }).catch(function (err) {
                                        res.json({ "Error": "廣播已發送，更新廣播餘額筆數出現錯誤，原因:" + err });
                                    })
                                }).catch(function (err) {
                                    res.json({ "Error": "資料庫加入廣播紀錄出現錯誤，原因:" + err });
                                })
                            }
                            //沒有對應用戶
                            else if (totalRecipient == 0) {
                                res.json({ "Error": "您的粉專還沒有符合發送條件的用戶喔!" });
                            }
                            //可發送廣播數不足
                            else {
                                res.json({ "Error": "您本月的可發送廣播筆數已不足囉!" });
                            }
                        }).catch(function (err) {
                            res.json({ "Error": "查詢廣播餘額出現錯誤, 原因:" + err });
                        })
                    }).catch(function (err) {
                        res.json({ "Error": "沒有找到對應的專頁資料" });
                    })
                }
                else {
                    res.json({ "Error": "沒有找到對應的用戶資料" });
                }
            })
        }
        else {
            res.json({ "Error": "請加入200字以內的文字廣播內容" });
        }
    }
    else {
        res.json({ "Error": "未傳入專頁名稱或廣播文字內容" });
    }
}

//廣播圖片功能
exports._BroadcastImage = function (req, res) {
    //確認文字長度
    //取得DB的粉絲專頁資料
    //確認本月剩餘可發送廣播數, 與Sender * 則數比較
    //取得PageToken
    //對GeneralSender廣播
    var pageID = req.body.PageID;
    var imgURL = req.body.ImageURL;
    var tag = req.body.Tag;
    var reply = req.body.Reply;
    if (pageID && imgURL) {
        //取得DB的粉絲專頁資料
        db._onValuePromise("EilisPSID", pageID).then(function (_PSIDData) {
            if (_PSIDData != null) {
                if (!_PSIDData.hasOwnProperty("SenderData")) {
                    res.json({ "Error": "您的粉專還沒有近期互動過的用戶喔!" });
                }
                var datetime = _dateToDBString(new Date(), "DateTime");
                var imageContent = {
                    "attachment": {
                        "type": "image",
                        "payload": {
                            "url": imgURL
                        }
                    }
                };
                db._onValuePromise("EilisFB", pageID).then(function (_FBData) {
                    if (_FBData.hasOwnProperty("EilisUI")) {
                        if (_FBData["EilisUI"].hasOwnProperty("Menu")) {
                            if (reply == null) {
                                cardContent["quick_replies"] = _FBData.EilisUI.Menu["公版主選單"].content.quick_replies;
                            }
                            else {
                                reply = HalfWidthToFullWidth(reply);
                                cardContent["quick_replies"] = _FBData.EilisUI.Menu[reply].content.quick_replies;
                            }
                        }
                    }
                    //取得PageToken
                    var pageToken = _FBData["PageBasicData"]["PageToken"];
                    var pageName = _FBData["PageBasicData"]["PageName"];
                    //確認本月剩餘可發送廣播數, 與Sender * 則數比較
                    var adminID = _FBData["PageBasicData"]["PageAdmin"]["UserID"];
                    var Ref = "EilisUser/" + adminID + "/ProductInfo";
                    var ChildName = "ProductFunction";
                    db._onValuePromise(Ref, ChildName).then(function (_ProductData) {
                        var broadcastLimit = (_ProductData["EilisBroadcastLimit"] >= 0) ? _ProductData["EilisBroadcastLimit"] : 0;
                        if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                            broadcastLimit += _ProductData["EilisBonusLimit"];
                        }
                        // 若有傳入Tag, 則確認符合Tag的互動用戶清單
                        // 沒有傳入Tag, 就直接發送給所有互動用戶
                        var allRecipientIDArr = [];
                        if (tag == null) {
                            Object.keys(_PSIDData["SenderData"]["GeneralSender"]).forEach(function (_PSID) {
                                if (_PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("BlackList") == -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("Unsubscribed") == -1) {
                                    allRecipientIDArr.push(_PSID);
                                }
                            })
                        }
                        else {
                            Object.keys(_PSIDData["SenderData"]["GeneralSender"]).forEach(function (_PSID) {
                                if (_PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf(tag) != -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("BlackList") == -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("Unsubscribed") == -1) {
                                    allRecipientIDArr.push(_PSID);
                                }
                            })
                        }
                        var totalRecipient = allRecipientIDArr.length;
                        if (broadcastLimit >= totalRecipient && totalRecipient != 0) {
                            setBroadcastRecordToDB(pageName, datetime, totalRecipient, imageContent).then(function (_DBKey) {
                                // 傳送廣播卡片給專頁粉絲
                                for (order = 0; order < totalRecipient; order++) {
                                    var receiver = new Receiver(adminID, pageName, allRecipientIDArr[order], pageToken, imageContent, _DBKey, order, totalRecipient);
                                }
                                var broadcastData = {
                                    "EilisBroadcastLimit": _ProductData["EilisBroadcastLimit"] - totalRecipient
                                }
                                if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                                    broadcastData = {
                                        "EilisBroadcastLimit": (_ProductData["EilisBroadcastLimit"] - totalRecipient >= 0) ? _ProductData["EilisBroadcastLimit"] - totalRecipient : (_ProductData["EilisBroadcastLimit"] < 0) ? _ProductData["EilisBroadcastLimit"] : 0,
                                        "EilisBonusLimit": (_ProductData["EilisBroadcastLimit"] - totalRecipient >= 0) ? _ProductData["EilisBonusLimit"] : (_ProductData["EilisBroadcastLimit"] > 0) ? _ProductData["EilisBonusLimit"] - (totalRecipient - _ProductData["EilisBroadcastLimit"]) : _ProductData["EilisBonusLimit"] - totalRecipient
                                    }
                                }
                                // 更新廣播餘額
                                db._update(Ref, ChildName, broadcastData).then(function () {
                                    // 設定完後結束Request, 不等全部廣播執行完。
                                    if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                                        res.json({
                                            "Message": "廣播訊息設定完成",
                                            "TotalRecipients": totalRecipient,
                                            "MonthlyQuota": broadcastData.EilisBroadcastLimit,
                                            "BonusQuota": broadcastData.EilisBonusLimit
                                        });
                                    }
                                    else {
                                        res.json({
                                            "Message": "廣播訊息設定完成",
                                            "TotalRecipients": totalRecipient,
                                            "MonthlyQuota": broadcastLimit - totalRecipient
                                        });
                                    }
                                }).catch(function (err) {
                                    res.json({ "Error": "廣播已發送，更新廣播餘額筆數出現錯誤，原因:" + err });
                                })
                            }).catch(function (err) {
                                res.json({ "Error": "資料庫加入廣播紀錄出現錯誤，原因:" + err });
                            })
                        }
                        //沒有對應用戶
                        else if (totalRecipient == 0) {
                            res.json({ "Error": "您的粉專還沒有符合發送條件的用戶喔!" });
                        }
                        //可發送廣播數不足
                        else {
                            res.json({ "Error": "您本月的可發送廣播筆數已不足囉!" });
                        }
                    }).catch(function (err) {
                        res.json({ "Error": "查詢廣播餘額出現錯誤, 原因:" + err });
                    })
                }).catch(function (err) {
                    res.json({ "Error": "沒有找到對應的專頁資料" });
                })
            }
            else {
                res.json({ "Error": "沒有找到對應的用戶資料" });
            }
        })
    }
    else {
        res.json({ "Error": "沒有傳入對應參數, 圖片廣播失敗" });
    }
}

//新版廣播Payload測試
exports._BroadcastPayload = function (req, res) {
    //取得DB的粉絲專頁資料
    //確認本月剩餘可發送廣播數, 與Sender * 則數比較
    //取得PageToken
    //對GeneralSender廣播
    var pageID = req.body.PageID;
    var cardID = req.body.CardID;
    var tag = req.body.Tag;
    var reply = req.body.Reply;
    if (pageID && cardID) {
        //取得DB的粉絲專頁資料
        db._onValuePromise("EilisPSID", pageID).then(function (_PSIDData) {
            if (_PSIDData != null) {
                if (!_PSIDData.hasOwnProperty("SenderData")) {
                    res.json({ "Error": "您的粉專還沒有近期互動過的用戶喔!" });
                }
                var datetime = _dateToDBString(new Date(), "DateTime");
                db._onValuePromise("EilisFB", pageID).then(function (_FBData) {
                    var cardContent = _FBData["EilisUI"]["Payload"][cardID]["content"];
                    if (_FBData.hasOwnProperty("EilisUI")) {
                        if (_FBData["EilisUI"].hasOwnProperty("Menu")) {
                            if (reply == null) {
                                cardContent["quick_replies"] = _FBData.EilisUI.Menu["公版主選單"].content.quick_replies;
                            }
                            else {
                                reply = HalfWidthToFullWidth(reply);
                                cardContent["quick_replies"] = _FBData.EilisUI.Menu[reply].content.quick_replies;
                            }
                        }
                    }
                    //取得PageToken
                    var pageToken = _FBData["PageBasicData"]["PageToken"];
                    var pageName = _FBData["PageBasicData"]["PageName"];
                    //確認本月剩餘可發送廣播數, 與Sender * 則數比較
                    var adminID = _FBData["PageBasicData"]["PageAdmin"]["UserID"];
                    var Ref = "EilisUser/" + adminID + "/ProductInfo";
                    var ChildName = "ProductFunction";
                    db._onValuePromise(Ref, ChildName).then(function (_ProductData) {
                        var broadcastLimit = (_ProductData["EilisBroadcastLimit"] >= 0) ? _ProductData["EilisBroadcastLimit"] : 0;
                        if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                            broadcastLimit += _ProductData["EilisBonusLimit"];
                        }
                        // 若有傳入Tag, 則確認符合Tag的互動用戶清單
                        // 沒有傳入Tag, 就直接發送給所有互動用戶
                        var allRecipientIDArr = [];
                        if (tag == null) {
                            Object.keys(_PSIDData["SenderData"]["GeneralSender"]).forEach(function (_PSID) {
                                if (_PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("BlackList") == -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("Unsubscribed") == -1) {
                                    allRecipientIDArr.push(_PSID);
                                }
                            })
                        }
                        else {
                            Object.keys(_PSIDData["SenderData"]["GeneralSender"]).forEach(function (_PSID) {
                                if (_PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf(tag) != -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("BlackList") == -1 && _PSIDData["SenderData"]["GeneralSender"][_PSID]["Tag"].indexOf("Unsubscribed") == -1) {
                                    allRecipientIDArr.push(_PSID);
                                }
                            })
                        }
                        var totalRecipient = allRecipientIDArr.length;
                        if (broadcastLimit >= totalRecipient && totalRecipient != 0) {
                            setBroadcastRecordToDB(pageName, datetime, totalRecipient, cardContent).then(function (_DBKey) {
                                // 傳送廣播卡片給專頁粉絲
                                for (order = 0; order < totalRecipient; order++) {
                                    var receiver = new Receiver(adminID, pageName, allRecipientIDArr[order], pageToken, cardContent, _DBKey, order, totalRecipient);
                                }
                                var broadcastData = {
                                    "EilisBroadcastLimit": _ProductData["EilisBroadcastLimit"] - totalRecipient
                                }
                                if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                                    broadcastData = {
                                        "EilisBroadcastLimit": (_ProductData["EilisBroadcastLimit"] - totalRecipient >= 0) ? _ProductData["EilisBroadcastLimit"] - totalRecipient : (_ProductData["EilisBroadcastLimit"] < 0) ? _ProductData["EilisBroadcastLimit"] : 0,
                                        "EilisBonusLimit": (_ProductData["EilisBroadcastLimit"] - totalRecipient >= 0) ? _ProductData["EilisBonusLimit"] : (_ProductData["EilisBroadcastLimit"] > 0) ? _ProductData["EilisBonusLimit"] - (totalRecipient - _ProductData["EilisBroadcastLimit"]) : _ProductData["EilisBonusLimit"] - totalRecipient
                                    }
                                }
                                // 更新廣播餘額
                                db._update(Ref, ChildName, broadcastData).then(function () {
                                    // 設定完後結束Request, 不等全部廣播執行完。
                                    if (_ProductData.hasOwnProperty("EilisBonusLimit") && _ProductData["EilisBonusLimit"] > 0) {
                                        res.json({
                                            "Message": "廣播訊息設定完成",
                                            "TotalRecipients": totalRecipient,
                                            "MonthlyQuota": broadcastData.EilisBroadcastLimit,
                                            "BonusQuota": broadcastData.EilisBonusLimit
                                        });
                                    }
                                    else {
                                        res.json({
                                            "Message": "廣播訊息設定完成",
                                            "TotalRecipients": totalRecipient,
                                            "MonthlyQuota": broadcastLimit - totalRecipient
                                        });
                                    }
                                }).catch(function (err) {
                                    res.json({ "Error": "廣播已發送，更新廣播餘額筆數出現錯誤，原因:" + err });
                                })
                            }).catch(function (err) {
                                res.json({ "Error": "資料庫加入廣播紀錄出現錯誤，原因:" + err });
                            })
                        }
                        //沒有對應用戶
                        else if (totalRecipient == 0) {
                            res.json({ "Error": "您的粉專還沒有符合發送條件的用戶喔!" });
                        }
                        //可發送廣播數不足
                        else {
                            res.json({ "Error": "您本月的可發送廣播筆數已不足囉!" });
                        }
                    }).catch(function (err) {
                        res.json({ "Error": "查詢廣播餘額出現錯誤, 原因:" + err });
                    })
                }).catch(function (err) {
                    res.json({ "Error": "沒有找到對應的專頁資料" });
                })
            }
            else {
                res.json({ "Error": "沒有找到對應的用戶資料" });
            }
        })
    }
    else {
        res.json({ "Error": "沒有傳入對應參數, 卡片廣播失敗" });
    }
}

//取得廣播人數
exports._GetBroadcastDetail = function (req, res) {
    var userID = req.body.UserID;
    var pageID = req.body.PageID;
    var tag = req.body.Tag || null;
    if (userID && pageID) {
        var info = new Info(userID, pageID, tag);
        info.getBroadcastDetail(info.userID, info.pageID, info.tag).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json(err);
        })
    }
    else {
        res.json({ "Error": "沒有傳入對應參數, 取得廣播人數失敗" });
    }
}

//臨時加值廣播功能
exports._AddBroadcastLimit = function (req, res) {
    var userID = req.body.UserID;
    var amount = req.body.Amount;
    if (userID && amount) {
        db._onValuePromise("EilisUser/" + userID + "/ProductInfo", "ProductFunction").then(function (_ProductFunction) {
            if (_ProductFunction != null) {
                var MonthlyQuota = _ProductFunction["EilisBroadcastLimit"];
                var BonusQuota = _ProductFunction["EilisBonusLimit"] || 0;
                // 若當月廣播則數為負，先嘗試補充當月廣播數到0，再補充加值廣播則數
                if (MonthlyQuota < 0) {
                    _ProductFunction["EilisBroadcastLimit"] = (MonthlyQuota + amount < 0) ? MonthlyQuota + amount : 0;
                    _ProductFunction["EilisBonusLimit"] = (MonthlyQuota + amount < 0) ? BonusQuota : BonusQuota + (amount + MonthlyQuota);
                }
                // 補充加值廣播則數
                else {
                    _ProductFunction["EilisBonusLimit"] = BonusQuota + amount;
                }
                //加總專頁廣播總數
                db._update("EilisUser/" + userID + "/ProductInfo", "ProductFunction", _ProductFunction).then(function () {
                    res.json({ "Message": "加值廣播" + amount + "則成功" });
                }).catch(function (err) {
                    res.json({ "Error": "加值廣播失敗, 更新加值廣播則數出現錯誤, 原因:" + err });
                });
            }
            else {
                res.json({ "Error": "找不到對應的用戶ID" });
            }
        })
    }
    else {
        res.json({ "Error": "沒有傳入對應參數, 臨時加值廣播失敗" });
    }
}

//加購廣播服務
// exports._DepositBroadcast = function (req, res) {
//     var userID = req.body.UserID;

//     if (userID) {
//         //取得目前Eilis服務類型
//         db._onValuePromise("EilisUser/" + userID, "ProductInfo").then(function (_ProductInfo) {
//             var ProductType = _ProductInfo["ProductLevel"] + "Broadcast";
//             //取得加值廣播總數
//             var RefPath = "EilisData/ProductSpec";
//             var ChildName = ProductType;
//             db._onValuePromise(RefPath, ChildName).then(function (_SpecData) {
//                 var BroadcastAddCount = _SpecData["EilisBroadcast"];
//                 var ProductPrice = _SpecData["Price"];
//                 var ProductData = {
//                     "Type": _SpecData["EilisType"],
//                     "Detail": _SpecData["Detail"],
//                     "Price": ProductPrice
//                 }
//                 //加總專頁廣播總數
//                 RefPath = "EilisUser/" + userID + "/ProductInfo" + "/ProductFunction/EilisBonusLimit";
//                 db._transactionCount(RefPath, BroadcastAddCount, function () {
//                     //加入購物清單
//                     RefPath = "EilisUser/" + userID + "/TradeInfo";
//                     ChildName = "PurchasedOnceList";
//                     db._push(RefPath, ChildName, ProductData).then(function () {
//                         RefPath = "EilisUser/" + userID + "/TradeInfo/OncePrice";
//                         //加總本月帳單
//                         db._transactionCount(RefPath, ProductPrice, function () {
//                             res.json({ "Message": "儲值廣播成功" });
//                         }).catch(function (err) {
//                             res.json({ "Error": "儲值廣播成功, 但更新本月帳單總額出現錯誤, 原因:" + err });
//                         });
//                     }).catch(function (err) {
//                         res.json({ "Error": "儲值廣播成功, 但更新購買商品清單出現錯誤, 原因:" + err });
//                     });
//                 }).catch(function (err) {
//                     res.json({ "Error": "儲值廣播失敗, 更新儲值廣播則數出現錯誤, 原因:" + err });
//                 });
//             }).catch(function (err) {
//                 res.json({ "Error": "儲值廣播失敗, 取得加值廣播總數出現錯誤, 原因:" + err });
//             })
//         }).catch(function (err) {
//             res.json({ "Error": "儲值廣播失敗, 取得服務類型出現錯誤, 原因:" + err });
//         })
//     }
//     else {
//         res.json({ "Error": "未傳入儲值廣播服務相關的參數" });
//     }
// }

//傳送廣播基本資訊到DB
function setBroadcastRecordToDB(pageName, datetime, totalRecipient, content) {
    //Update PageName, DateTime, TotalRecipient, Content
    var RefPath = "AllBroadcastRecord";
    var ChildName = pageName;
    var Data = {
        "TotalRecipient": totalRecipient,
        "DateTime": datetime,
        "Content": content
    };
    return db._push(RefPath, ChildName, Data).then(function (_Key) {
        Data = {
            "LastKey": _Key
        }
        return db._update(RefPath, ChildName, Data).then(function (_Result) {
            return Promise.resolve(_Key);
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }).catch(function (err) {
        return Promise.reject(err);
    });
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

// 半形轉全形(Firebase特殊字元處理)
function HalfWidthToFullWidth(input) {
    return input.replace("$", "＄").replace("#", "＃").replace(".", "．").replace("[", "［").replace("]", "］");
}