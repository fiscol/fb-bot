var db = require('../../db/firebase_db.js');
var Q = require("q");
var requestPromise = require('request-promise');
var crypto = require('crypto');
const TimeNow = require('../../tool/TimeNow');
const EscapeLetter = require('../../tool/EscapeLetter');

var PageSetting = function (pageName, pageID, userName, userID, pageToken) {
    this.pageName = pageName;
    this.pageID = pageID;
    this.userName = userName;
    this.userID = userID;
    this.pageToken = pageToken;
}

// 取得FB專頁pagetoken
PageSetting.prototype.getPageToken = function (pageID, userID) {
    var Ref = "EilisUser/" + userID + "/UserBasicData/AllPageData/data";
    var ChildName = "id";
    return db._equalTo(Ref, ChildName, pageID, null).then(function (_PageData) {
        if (_PageData != null) {
            var DBPageIndex = Object.getOwnPropertyNames(_PageData)[0];
            var PageToken = _PageData[DBPageIndex]["access_token"];
            return Promise.resolve(PageToken);
        }
        else {
            return Promise.reject("找不到對應FB專頁資訊");
        }
    }).catch(function (err) {
        return Promise.reject(err);
    });
}

// FB專頁subscribe串接webhook
PageSetting.prototype.setPageSubscribtion = function (pageID, pageToken) {
    var options = {
        uri: 'https://graph.facebook.com/v2.6/me/subscribed_apps',
        qs: { access_token: pageToken },
        headers: {
            'User-Agent': 'Request-Promise'
        },
        method: 'POST',
        json: true
    };

    return requestPromise(options)
        .then(function (parsedBody) {
            db._update("EilisFB/" + pageID + "/ServiceSetting", "PageSubscribtion", options).then(function () {
                return Promise.resolve("設定FB專頁subscribe串接webhook成功");
            }).catch(function (err) {
                return Promise.reject("儲存FB專頁subscribe設定失敗, 原因:" + err);
            })
        })
        .catch(function (err) {
            return Promise.reject("設定FB專頁subscribe串接webhook失敗, 原因:" + err);
        });
}

// 加入開始使用按鈕
PageSetting.prototype.addGetStartButton = function (pageID, pageToken) {
    var options = {
        uri: 'https://graph.facebook.com/v2.6/me/thread_settings/',
        qs: { access_token: pageToken },
        method: 'POST',
        body: {
            setting_type: "call_to_actions",
            thread_state: "new_thread",
            call_to_actions: [
                {
                    payload: "開始使用"
                }
            ]
        },
        json: true
    };

    return requestPromise(options).then(function (parsedBody) {
        db._update("EilisFB/" + pageID + "/ServiceSetting", "AddGetStartButton", options).then(function () {
            return Promise.resolve("加入開始使用按鈕成功");
        }).catch(function (err) {
            return Promise.reject("儲存FB專頁加入開始按鈕設定失敗, 原因:" + err);
        })
    }).catch(function (err) {
        return Promise.reject("加入開始使用按鈕失敗, 原因:" + err);
    });
}

// 檢查專頁狀態
PageSetting.prototype.checkPageStatus = function (userID, pageID) {
    return new Promise((resolve, reject) => {
        db._onValuePromise('EilisUser/' + userID + '/UserBasicData', 'AllPageData').then(function (_AllPageData) {
            for (var i = 0; i < _AllPageData["data"].length; i++) {
                if (_AllPageData["data"][i]["id"] == pageID && _AllPageData["data"][i]["status"] == "Not Enabled Page") {
                    return resolve('確認過為新加入的專頁');
                }
                else if (_AllPageData["data"][i]["id"] == pageID && _AllPageData["data"][i]["status"] != "Not Enabled Page") {
                    if (_AllPageData["data"][i]["status"] == "Registered Page") {
                        return reject("此頁面目前已經有其他管理者註冊Eilis服務囉");
                    }
                    else {
                        return resolve('此頁已加入服務');
                    }
                }
            }
        }).catch(function (err) {
            return reject("取得專頁資訊失敗, 原因:" + err);
        })
    });
}

//註冊服務後產生邀請碼, 寫入DB, 之後不會更動(in:會員ID, out:邀請碼)
PageSetting.prototype.genInviteCode = function (UserID) {
    if (UserID) {
        // 檢查是否已註冊
        var RefPath = "EilisUser";
        var ChildName = UserID;
        return db._onValuePromise(RefPath, ChildName).then(function (_RegisteredData) {
            // 未註冊
            if (_RegisteredData == null) {
                return Promise.reject({ "Error": "使用者尚未完成註冊" });
            }
            else {
                // 檢查是否已有邀請碼
                RefPath = "EilisUser/" + UserID + "/TradeInfo";
                ChildName = "InviteCode";
                return db._onValuePromise(RefPath, ChildName).then(function (_InviteCode) {
                    // 已有邀請碼, 直接回傳
                    if (_InviteCode != null) {
                        return Promise.resolve({ "InviteCode": _InviteCode });
                    }
                    // 沒有邀請碼
                    else {
                        //產製5碼隨機碼
                        var InviteCode = _genInviteCode();
                        //到DB檢查是否已存在該組邀請碼
                        return checkInviteCodeInDB(UserID, InviteCode).then(function () {
                            // 沒有重複，存入DB
                            RefPath = "EilisUser/" + UserID;
                            ChildName = "TradeInfo";
                            var Data = {
                                "InviteCode": InviteCode
                            };
                            // 存到DB
                            return db._update(RefPath, ChildName, Data).then(function (_Result) {
                                // 回傳邀請碼
                                return Promise.resolve({ "InviteCode": InviteCode });
                            }).catch(function (err) {
                                return Promise.reject({ "Error": "產製邀請碼出現錯誤, 原因:" + err });
                            });
                        }).catch(function (err) {
                            return Promise.reject({ "Error": "產製邀請碼出現錯誤, 原因:" + err });
                        });
                    }
                }).catch(function (err) {
                    return Promise.reject({ "Error": "產製邀請碼出現錯誤, 原因:" + err });
                });
            }
        }).catch(function (err) {
            return Promise.reject({ "Error": "產製邀請碼出現錯誤, 原因:" + err });
        });
    }
    else {
        return Promise.reject({ "Error": "未傳入會員ID" });
    }
}

// 加入新產品到已購買服務內
PageSetting.prototype.addServiceProduct = function (userID, pageID, productType) {
    var Ref = "EilisUser/" + userID;
    var ChildName = "UserBasicData";
    return db._onValuePromise(Ref, ChildName).then(function (_UserBasicData) {
        // 特殊判斷: 只有Eilis特殊碼註冊會直接設定為商務版
        var isEilisSpecialCode = (_UserBasicData.hasOwnProperty("BonusCode") && _UserBasicData.BonusCode == "EilisSpecialCode") ? true : false;
        productType = (isEilisSpecialCode) ? "ECHigh" : productType;
        Ref = "EilisData/ProductSpec";
        ChildName = productType;
        return db._onValuePromise(Ref, ChildName).then(function (_SpecData) {
            Ref = "EilisUser/" + userID;
            ChildName = "ProductInfo";
            var ProductDetail = {};
            // 產品規格
            ProductDetail.ProductFunction = {
                EilisAutoQA: _SpecData["EilisAutoQA"],
                EilisBlueMenu: _SpecData["EilisUI"]["BlueMenu"],
                EilisReplyMessage: _SpecData["EilisUI"]["ReplyMessage"],
                EilisReplyImage: _SpecData["EilisUI"]["ReplyImage"],
                EilisReplyVideo: _SpecData["EilisUI"]["ReplyVideo"],
                EilisReplyMessageCard: _SpecData["EilisUI"]["ReplyMessageCard"],
                EilisReplyImageCard: _SpecData["EilisUI"]["ReplyImageCard"],
                EilisReplyWebCard: _SpecData["EilisUI"]["ReplyWebCard"],
                // 特殊判斷: 只有Eilis特殊碼註冊，會直接設定為5000則廣播額度
                EilisBroadcastLimit: (isEilisSpecialCode) ? 5000 : _SpecData["EilisBroadcast"],
                EilisBonusLimit: _SpecData["EilisBonus"],
                EilisEditorLimit: _SpecData["EilisEditorLimit"],
                EilisEditorTotal: _SpecData["EilisEditorTotal"],
                EilisKeywords: _SpecData["EilisKeywords"]
            };
            ProductDetail.ProductLevel = productType;
            ProductDetail.ProductRegiestTime = TimeNow.TimeNow();
            var ProductPrice = _SpecData["Price"];
            // 產品類型, 價錢與詳細價目
            var TradeData = {
                "PurchasedService": {
                    "Type": _SpecData["EilisType"],
                    "Detail": _SpecData["Detail"],
                    "Price": ProductPrice,
                    "PayStatus": "Not Paid"
                },
                "OncePrice": 0
            }
            // 設定啟用扣除優惠天數
            var PageAddedData = {
                "PageAdded": true
            }
            // 更新專頁status為已啟用, 未付款
            return db._onValuePromise("EilisUser/" + userID + "/UserBasicData", "AllPageData").then(function (_AllPageData) {
                var AddedPagesAlready = false;
                for (var i = 0; i < _AllPageData["data"].length; i++) {
                    if (_AllPageData["data"][i]["id"] == pageID) {
                        _AllPageData["data"][i]["status"] = "Started, Not Paid Page";
                    }
                    else if (_AllPageData["data"][i]["status"] != "Registered Page" && _AllPageData["data"][i]["status"] != "Not Enabled Page") {
                        AddedPagesAlready = true;
                    }
                }
                return db._update("EilisUser/" + userID + "/UserBasicData", "AllPageData", _AllPageData).then(function () {
                    // 第一次設定專頁, 更新產品內容
                    if (AddedPagesAlready == false) {
                        return db._set(Ref, ChildName, ProductDetail).then(function () {
                            // 加入至使用者付費清單
                            return db._update("EilisUser/" + userID, "TradeInfo", TradeData).then(function () {
                                return db._update("EilisUser/" + userID, "UserBasicData", PageAddedData).then(function () {
                                    return Promise.resolve("加入新產品成功");
                                }).catch(function (err) {
                                    return Promise.reject("加入新產品成功, 啟用扣除優惠天數出現錯誤, 原因:" + err);
                                });
                            }).catch(function (err) {
                                return Promise.reject("加入新產品成功, 更新購買商品清單出現錯誤, 原因:" + err);
                            });
                        }).catch(function (err) {
                            return Promise.reject("加入新產品失敗, 原因:" + err);
                        });
                    }
                    else {
                        return Promise.resolve("加入新產品成功");
                    }
                }).catch(function (err) {
                    return Promise.reject("更新專頁設定狀態失敗, 原因:" + err);
                });
            }).catch(function (err) {
                return Promise.reject("取得專頁資料失敗, 原因:" + err);
            });
        })
    }).catch(function (err) {
        return Promise.reject("取得專頁資訊失敗, 原因:" + err);
    });
}

// 儲存專頁資訊到DB
PageSetting.prototype.savePageInfoToDB = function (pageName, pageID, pageToken, userName, userID) {
    var Ref = "EilisFB";
    var ChildName = pageID + "/PageBasicData";
    pageName = EscapeLetter.EscapeLetter(pageName);//Avoid data key with "."
    var PageInfo = {};
    PageInfo = {
        "PageName": pageName,
        "PageID": pageID,
        "PageToken": pageToken,
        "PageAdmin": {
            "UserID": userID,
            "UserName": userName
        },
        "ActivityTime": TimeNow.TimeNow()
    }
    return db._set(Ref, ChildName, PageInfo).then(function () {
        return Promise.resolve("儲存專頁資訊到DB成功");
    }).catch(function (err) {
        return Promise.reject("儲存專頁資訊到DB失敗, 原因:" + err);
    });
}

// 回傳服務規格
PageSetting.prototype.getPlanDetail = function (userID) {
    var Ref = "EilisUser/" + userID + "/ProductInfo";
    var ChildName = "ProductFunction";
    return db._onValuePromise(Ref, ChildName).then(function (_PlanData) {
        return Promise.resolve(_PlanData);
    }).catch(function (err) {
        return Promise.reject(err);
    })
}

// 回傳已填資訊
PageSetting.prototype.getEditedDetail = function (pageID) {
    var Ref = "EilisFB";
    var ChildName = pageID;
    return db._onValuePromise(Ref, ChildName).then(function (_EditedData) {
        var EditedData = {
            "EilisAutoQA": null,
            "Greeting": null,
            "WelcomeText": null,
            "HintText": null,
            "MainUrl": null
        }
        if (_EditedData.hasOwnProperty("EilisQASetting")) {
            EditedData.EilisAutoQA = _EditedData.EilisQASetting.QAScript;
        }
        if (_EditedData.hasOwnProperty("EilisHintData")) {
            EditedData.HintText = _EditedData.EilisHintData.HintText;
        }
        if (_EditedData.hasOwnProperty("ServiceSetting")) {
            if (_EditedData.ServiceSetting.hasOwnProperty("AddGreeting")) {
                EditedData.Greeting = _EditedData.ServiceSetting.AddGreeting.body.greeting.text;
            }
            if (_EditedData.ServiceSetting.hasOwnProperty("AddPermanentMenu")) {
                EditedData.MainUrl = _EditedData.ServiceSetting.AddPermanentMenu.body.call_to_actions[1].url;
            }
        }
        if (_EditedData.hasOwnProperty("EilisWelcomeData")) {
            EditedData.WelcomeText = _EditedData.EilisWelcomeData.WelcomeText;
        }
        //預留暫存廣播訊息
        return Promise.resolve(EditedData);
    }).catch(function (err) {
        console.trace(err);
        return Promise.reject(err);
    })
}

// 暫停所有功能(對單一專頁)
PageSetting.prototype.suspendFunctions = function (userID, pageID, pageToken) {
    // 取得已註冊的功能設定
    var RefPath = "EilisFB/" + pageID;
    var ChildName = "ServiceSetting";
    return new Promise((resolve, reject) => {
        db._onValuePromise(RefPath, ChildName).then(function (_Settings) {
            if (_Settings == null) {
                return resolve("這個專頁目前沒有綁定Eilis功能");
            }
            else {
                var PromiseArr = [];
                // 對多個功能的設定內容(options), 以DELETE傳送給Facebook API做關閉
                for (var i = 0; i < Object.keys(_Settings).length; i++) {
                    var functionName = Object.keys(_Settings)[i];
                    // 關閉所有FB設定類功能, 除了Webhook(用戶互動仍會記錄到DB)
                    if (functionName != "PageSubscribtion") {
                        var options = _Settings[functionName];
                        options["method"] = 'DELETE';
                        if (functionName == "AddPermanentMenu" && options["body"].hasOwnProperty("persistent_menu")) {
                            options["body"] = {
                                "fields": [
                                    "persistent_menu",
                                    "get_started"
                                ]
                            };
                        }
                        PromiseArr.push(triggerFBFunctions(options));
                    }
                }
                var Step1 = Q.all(PromiseArr);
                Step1.then(function () {
                    RefPath = "EilisUser/" + userID + "/UserBasicData";
                    ChildName = "AllPageData";

                    db._onValuePromise(RefPath, ChildName).then(function (_AllPageData) {
                        for (var i = 0; i < _AllPageData["data"].length; i++) {
                            if (_AllPageData["data"][i]["id"] == pageID) {
                                if (_AllPageData["data"][i]["status"] == "Started, Not Paid Page") {
                                    _AllPageData["data"][i]["status"] = "Suspended, Not Paid Page";
                                }
                                else if (_AllPageData["data"][i]["status"] == "Started, Already Paid Page") {
                                    _AllPageData["data"][i]["status"] = "Suspended, Already Paid Page";
                                }
                            }
                        }
                        db._update(RefPath, ChildName, _AllPageData).then(function () {
                            return resolve("已暫停專頁Eilis功能");
                        }).catch(function (err) {
                            return reject("更新專頁資料狀態失敗, 原因:" + err);
                        })
                    }).catch(function (err) {
                        return reject("取得專頁資料失敗, 原因:" + err);
                    })
                }).catch(function (err) {
                    return reject("移除專頁功能失敗, 原因:" + err);
                });
            }
        }).catch(function (err) {
            return reject("取得專頁功能失敗, 原因:" + err);
        })
    });
}

// 復原所有功能(對單一專頁)
PageSetting.prototype.restartFunctions = function (userID, pageID, pageToken) {
    // 取得已註冊的功能設定
    var RefPath = "EilisFB/" + pageID;
    var ChildName = "ServiceSetting";
    return new Promise((resolve, reject) => {
        db._onValuePromise(RefPath, ChildName).then(function (_Settings) {
            if (_Settings == null) {
                return resolve("這個專頁目前沒有綁定Eilis功能");
            }
            else {
                var PromiseArr = [];
                // 對多個功能的設定內容(options), 以POST傳送給Facebook API做開啟
                for (var i = 0; i < Object.keys(_Settings).length; i++) {
                    var functionName = Object.keys(_Settings)[i];
                    var options = _Settings[functionName];
                    // 新版的AddPermanentMenu設定在body底下有persistent_menu子層
                    if (_Settings.hasOwnProperty("AddPermanentMenu") && _Settings["AddPermanentMenu"]["body"].hasOwnProperty("persistent_menu")) {
                        // 新版還原需要先啟動開始使用，再啟動主選單
                        if (functionName == "AddPermanentMenu") {
                            var NewGetStartedOptions = Object.assign({}, _Settings["AddGetStartButton"]);
                            var NewPermanentMenuOptions = Object.assign({}, options);
                            PromiseArr.push(triggerPermanentMenu(NewGetStartedOptions, NewPermanentMenuOptions));
                        }
                        // 其他功能還原
                        else if (functionName != "AddGetStartButton") {
                            PromiseArr.push(triggerFBFunctions(options));
                        }
                    }
                    // 舊版的主選單與開始使用沒有先後還原的差別
                    else {
                        PromiseArr.push(triggerFBFunctions(options));
                    }
                }

                RefPath = "EilisUser/" + userID + "/UserBasicData";
                ChildName = "AllPageData";
                var Step1 = Q.all(PromiseArr);
                Step1.then(function () {
                    db._onValuePromise(RefPath, ChildName).then(function (_AllPageData) {
                        for (var i = 0; i < _AllPageData["data"].length; i++) {
                            if (_AllPageData["data"][i]["id"] == pageID) {
                                if (_AllPageData["data"][i]["status"] == "Suspended, Not Paid Page") {
                                    _AllPageData["data"][i]["status"] = "Started, Not Paid Page";
                                }
                                else if (_AllPageData["data"][i]["status"] == "Suspended, Already Paid Page") {
                                    _AllPageData["data"][i]["status"] = "Started, Already Paid Page";
                                }
                            }
                        }
                        db._update(RefPath, ChildName, _AllPageData).then(function () {
                            return resolve("已重新啟動專頁Eilis功能");
                        }).catch(function (err) {
                            return reject("更新專頁資料狀態失敗, 原因:" + err);
                        })
                    }).catch(function (err) {
                        return reject("取得專頁資料失敗, 原因:" + err);
                    })
                }).catch(function (err) {
                    return reject("重新啟動專頁功能失敗, 原因:" + err);
                });
            }
        }).catch(function (err) {
            return reject("取得專頁功能失敗, 原因:" + err);
        })
    });
}

// 取得用戶付費方案種類
PageSetting.prototype.getUserPlan = function (userID) {
    var Ref = "EilisUser/" + userID + "/TradeInfo";
    var ChildName = "PurchasedService";
    return db._onValuePromise(Ref, ChildName).then(function (_UserPlanData) {
        Ref = "EilisUser/" + userID;
        ChildName = "ProductInfo";
        return db._onValuePromise(Ref, ChildName).then(function (_UserProductData) {
            _UserPlanData["ProductType"] = _UserProductData.ProductLevel;
            return Promise.resolve(_UserPlanData);
        }).catch(function (err) {
            return Promise.reject(err);
        })
    }).catch(function (err) {
        return Promise.reject(err);
    })
}

// 用戶切換付費方案
PageSetting.prototype.changePlan = function (userID, productType) {
    var Ref = "EilisUser";
    var ChildName = userID;
    return db._onValuePromise(Ref, ChildName).then(function (_UserData) {
        var isEilisSpecialCode = (_UserData.UserBasicData.hasOwnProperty("BonusCode") && _UserData.UserBasicData.BonusCode == "EilisSpecialCode") ? true : false;
        productType = (isEilisSpecialCode) ? "ECHigh" : productType;
        // 變更方案規格
        var Ref = "EilisData/ProductSpec"
        var ChildName = productType;
        return db._onValuePromise(Ref, ChildName).then(function (_SpecData) {
            if (_UserData.hasOwnProperty("ProductInfo") && _UserData.ProductInfo.ProductLevel == productType) {
                return Promise.resolve("方案並未變更，您已註冊本付費方案");
            }
            else {
                var ProductDetail = {};
                // 產品規格
                ProductDetail.ProductFunction = {
                    EilisAutoQA: _SpecData["EilisAutoQA"],
                    EilisBlueMenu: _SpecData["EilisUI"]["BlueMenu"],
                    EilisReplyMessage: _SpecData["EilisUI"]["ReplyMessage"],
                    EilisReplyImage: _SpecData["EilisUI"]["ReplyImage"],
                    EilisReplyVideo: _SpecData["EilisUI"]["ReplyVideo"],
                    EilisReplyMessageCard: _SpecData["EilisUI"]["ReplyMessageCard"],
                    EilisReplyImageCard: _SpecData["EilisUI"]["ReplyImageCard"],
                    EilisReplyWebCard: _SpecData["EilisUI"]["ReplyWebCard"],
                    EilisBroadcastLimit: (isEilisSpecialCode) ? 5000 : _SpecData["EilisBroadcast"],
                    EilisBonusLimit: _SpecData["EilisBonus"],
                    EilisEditorLimit: _SpecData["EilisEditorLimit"],
                    EilisEditorTotal: _SpecData["EilisEditorTotal"],
                    EilisKeywords: _SpecData["EilisKeywords"]
                };
                ProductDetail.ProductLevel = productType;
                ProductDetail.ProductRegiestTime = TimeNow.TimeNow();
                var ProductPrice = _SpecData["Price"];
                // 變更付費資料
                var TradeData = {
                    "PurchasedService": {
                        "Type": _SpecData["EilisType"],
                        "Detail": _SpecData["Detail"],
                        "Price": ProductPrice,
                        "PayStatus": "Not Paid"
                    }
                }
                // 更新產品內容
                Ref = "EilisUser/" + userID;
                ChildName = "ProductInfo";
                return db._set(Ref, ChildName, ProductDetail).then(function () {
                    // 加入至使用者付費清單
                    return db._update("EilisUser/" + userID, "TradeInfo", TradeData).then(function () {
                        return Promise.resolve("變更方案成功");
                    }).catch(function (err) {
                        return Promise.reject("變更方案成功, 更新付費資料出現錯誤, 原因:" + err);
                    });
                }).catch(function (err) {
                    return Promise.reject("變更方案失敗, 原因:" + err);
                });
            }
        }).catch(function (err) {
            return Promise.reject("變更方案失敗, 原因:" + err);
        });
    })
};

// 設定新付費方案
PageSetting.prototype.setNewPlan = function (planName, planDetail) {
    // 變更方案規格
    var Ref = "EilisData/ProductSpec"
    var ChildName = planName;
    return db._onValuePromise(Ref, ChildName).then(function (_PlanData) {
        if (_PlanData != null) {
            return Promise.reject("已存在此方案名稱，請使用其他PlanName");
        }
        else {
            var ProductDetail = {};
            // 產品規格
            ProductDetail = {
                Detail: planDetail["Detail"],
                EilisAutoQA: planDetail["EilisAutoQA"],
                EilisBroadcast: planDetail["EilisBroadcast"],
                EilisBonus: 0,
                EilisEditorLimit: planDetail["EilisEditorLimit"],
                EilisEditorTotal: planDetail["EilisEditorTotal"],
                EilisKeywords: planDetail["EilisKeywords"],
                EilisType: "Service",
                EilisUI: planDetail["EilisUI"],
                Price: planDetail["Price"]
            };
            return db._set(Ref, ChildName, ProductDetail).then(function () {
                return Promise.resolve("設定新付費方案成功");
            }).catch(function (err) {
                return Promise.reject("設定新付費方案失敗, 原因:" + err);
            });
        }
    }).catch(function (err) {
        return Promise.reject("設定新付費方案失敗, 原因:" + err);
    });
};

// 設定新廣播付費方案
PageSetting.prototype.setNewBroadcastPlan = function (planName, broadcastPlanDetail) {
    // 變更方案規格
    var Ref = "EilisData/ProductSpec"
    var ChildName = planName;
    return db._onValuePromise(Ref, ChildName).then(function (_PlanData) {
        if (_PlanData != null) {
            return Promise.reject("已存在此廣播方案名稱，請使用其他PlanName");
        }
        else {
            var ProductDetail = {};
            // 產品規格
            ProductDetail = {
                Detail: broadcastPlanDetail["Detail"],
                EilisBroadcast: broadcastPlanDetail["EilisBroadcast"],
                EilisType: "Bonus",
                Price: broadcastPlanDetail["Price"]
            };
            return db._set(Ref, ChildName, ProductDetail).then(function () {
                return Promise.resolve("設定新廣播付費方案成功");
            }).catch(function (err) {
                return Promise.reject("設定新廣播付費方案失敗, 原因:" + err);
            });
        }
    }).catch(function (err) {
        return Promise.reject("設定新廣播付費方案失敗, 原因:" + err);
    });
};

// 取得方案內容
PageSetting.prototype.getPlanContent = function (planName) {
    // 變更方案規格
    var Ref = (planName == "All") ? "EilisData" : "EilisData/ProductSpec"
    var ChildName = (planName == "All") ? "ProductSpec" : planName;
    return db._onValuePromise(Ref, ChildName).then(function (_PlanData) {
        if (_PlanData == null) {
            return Promise.reject("找不到對應的方案內容!");
        }
        else {
            return Promise.resolve(_PlanData);
        }
    }).catch(function (err) {
        return Promise.reject("取得方案內容失敗, 原因:" + err);
    });
};

// 更新方案內容
PageSetting.prototype.updatePlan = function (planName, planDetail) {
    // 變更方案規格
    var Ref = "EilisData/ProductSpec"
    var ChildName = planName;
    return db._onValuePromise(Ref, ChildName).then(function (_PlanData) {
        if (_PlanData != null) {
            var ProductDetail = {};
            // 產品規格
            ProductDetail = {
                Detail: planDetail["Detail"] || _PlanData["Detail"],
                EilisAutoQA: planDetail["EilisAutoQA"] || _PlanData["EilisAutoQA"],
                EilisBroadcast: planDetail["EilisBroadcast"] || _PlanData["EilisBroadcast"],
                EilisBonus: 0,
                EilisEditorLimit: planDetail["EilisEditorLimit"] || _PlanData["EilisEditorLimit"],
                EilisEditorTotal: planDetail["EilisEditorTotal"] || _PlanData["EilisEditorTotal"],
                EilisKeywords: planDetail["EilisKeywords"] || _PlanData["EilisKeywords"],
                EilisType: "Service",
                EilisUI: planDetail["EilisUI"] || _PlanData["EilisUI"],
                Price: planDetail["Price"] || _PlanData["Price"]
            };
            return db._set(Ref, ChildName, ProductDetail).then(function () {
                return Promise.resolve("更新方案內容成功");
            }).catch(function (err) {
                return Promise.reject("更新方案內容失敗, 原因:" + err);
            });
        }
        else {
            return Promise.reject("不存在此方案，請使用其他PlanName");
        }
    }).catch(function (err) {
        return Promise.reject("更新方案內容失敗, 原因:" + err);
    });
};

// 更新廣播方案內容
PageSetting.prototype.updateBroadcastPlan = function (planName, broadcastPlanDetail) {
    // 變更方案規格
    var Ref = "EilisData/ProductSpec"
    var ChildName = planName;
    return db._onValuePromise(Ref, ChildName).then(function (_PlanData) {
        if (_PlanData != null) {
            var ProductDetail = {};
            // 產品規格
            ProductDetail = {
                Detail: broadcastPlanDetail["Detail"] || _PlanData["Detail"],
                EilisBroadcast: broadcastPlanDetail["EilisBroadcast"] || _PlanData["EilisBroadcast"],
                EilisType: "Bonus",
                Price: broadcastPlanDetail["Price"] || _PlanData["Price"]
            };
            return db._set(Ref, ChildName, ProductDetail).then(function () {
                return Promise.resolve("更新廣播方案內容成功");
            }).catch(function (err) {
                return Promise.reject("更新廣播方案內容失敗, 原因:" + err);
            });
        }
        else {
            return Promise.reject("不存在此方案，請使用其他PlanName");
        }
    }).catch(function (err) {
        return Promise.reject("更新廣播方案內容失敗, 原因:" + err);
    });
};

// 開啟非客服時間回覆
PageSetting.prototype.turnOnOfficeSetting = function (pageID) {
    var Ref = "EilisFB/" + pageID;
    var ChildName = "OfficeSetting";
    var UpdateData = {
        "OutOfService": true
    }
    return new Promise((resolve, reject) => {
        return db._update(Ref, ChildName, UpdateData).then(function () {
            return resolve("ok");
        }).catch(function (err) {
            return reject(err);
        })
    });
}

// 開啟非客服時間回覆
PageSetting.prototype.turnOffOfficeSetting = function (pageID) {
    var Ref = "EilisFB/" + pageID;
    var ChildName = "OfficeSetting";
    var UpdateData = {
        "OutOfService": false
    }
    return new Promise((resolve, reject) => {
        return db._update(Ref, ChildName, UpdateData).then(function () {
            return resolve("ok");
        }).catch(function (err) {
            return reject(err);
        })
    });
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

function _addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
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

var triggerFBFunctions = function (options) {
    var deferred = Q.defer();
    requestPromise(options).then(function (parsedBody) {
        deferred.resolve("Succeed");
    }).catch(function (err) {
        deferred.reject("設定專頁其他功能失敗, 原因:" + err);
    });
    return deferred.promise;
}

var triggerPermanentMenu = function (NewGetStartedOptions, NewPermanentMenuOptions) {
    var deferred = Q.defer();
    console.log(JSON.stringify(NewGetStartedOptions));
    console.log(JSON.stringify(NewPermanentMenuOptions));
    requestPromise(NewGetStartedOptions).then(function (parsedBody) {
        requestPromise(NewPermanentMenuOptions).then(function (parsedBody) {
            deferred.resolve("Succeed");
        }).catch(function (err) {
            deferred.reject("設定專頁Menu功能失敗, 原因:" + err);
        });
    }).catch(function (err) {
        deferred.reject("設定專頁開始使用功能失敗, 原因:" + err);
    });
    return deferred.promise;
}

module.exports = PageSetting;