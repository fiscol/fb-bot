var PageSetting = require('./model.js');

// 加入粉絲專頁到Eilis服務
exports._AddPageToEilis = function (req, res) {
    var PageName = req.body.PageName;
    var PageID = req.body.PageID;
    var UserName = req.body.UserName;
    var UserID = req.body.UserID;
    var ProductType = req.body.ProductType;
    if (PageName && PageID && UserName && UserID) {
        var pageSetting = new PageSetting(PageName, PageID, UserName, UserID, null);
        pageSetting.getPageToken(PageID, UserID).then(function (_PageToken) {
            pageSetting.pageToken = _PageToken;
            // 後端檢查防呆, 暫不啟用
            pageSetting.checkPageStatus(pageSetting.userID, pageSetting.pageID).then(function (_IsNewPage) {
                if (_IsNewPage == "確認過為新加入的專頁") {
                    pageSetting.savePageInfoToDB(pageSetting.pageName, pageSetting.pageID, pageSetting.pageToken, pageSetting.userName, pageSetting.userID).then(function () {
                        pageSetting.setPageSubscribtion(pageSetting.pageID, pageSetting.pageToken).then(function () {
                            pageSetting.addGetStartButton(pageSetting.pageID, pageSetting.pageToken).then(function () {
                                pageSetting.addServiceProduct(pageSetting.userID, pageSetting.pageID, ProductType).then(function () {
                                    //轉頁到後台單一頁面功能設定頁面
                                    res.json({ "Message": "已成功加入專頁到Eilis服務" });
                                }).catch(function (err) {
                                    res.json({ "Error": "加入專頁至Eilis出現錯誤, 原因:" + err });
                                })
                            }).catch(function (err) {
                                res.json({ "Error": "加入專頁至Eilis出現錯誤, 原因:" + err });
                            })
                        }).catch(function (err) {
                            res.json({ "Error": "加入專頁至Eilis出現錯誤, 原因:" + err });
                        })
                    }).catch(function (err) {
                        res.json({ "Error": "加入專頁至Eilis出現錯誤, 原因:" + err });
                    })
                }
                else if (_IsNewPage == "此頁已加入服務") {
                    pageSetting.restartFunctions(pageSetting.userID, pageSetting.pageID, pageSetting.pageToken).then(function () {
                        res.json({ "Message": "已重新啟動專頁Eilis功能" });
                    }).catch(function (err) {
                        res.json({ "Error": "重新啟動專頁功能出現錯誤, 原因:" + err });
                    });
                }
            }).catch(function (err) {
                res.json({ "Error": "加入專頁至Eilis出現錯誤, 原因:" + err });
            })
        }).catch(function (err) {
            res.json({ "Error": "加入專頁至Eilis出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入完整查詢參數, 設定專頁加入Eilis失敗" });
    }
};

// 回傳服務規格
exports._GetPlanDetail = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        var pageSetting = new PageSetting(null, null, null, UserID, null);
        pageSetting.getPlanDetail(pageSetting.userID).then(function (_PlanDetail) {
            res.json(_PlanDetail);
        }).catch(function (err) {
            res.json({ "Error": "回傳服務規格出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入管理者ID" });
    }
}

// 回傳已填資訊
exports._GetEditedDetail = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        var pageSetting = new PageSetting(null, PageID, null, null, null);
        pageSetting.getEditedDetail(pageSetting.pageID).then(function (_EditedDetail) {
            res.json(_EditedDetail);
        }).catch(function (err) {
            res.json({ "Error": "回傳已填資訊出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入頁面ID" });
    }
}

// 暫停所有功能(對單一專頁)
exports._SuspendFunctions = function (req, res) {
    var UserID = req.body.UserID;
    var PageID = req.body.PageID;
    if (UserID && PageID) {
        var pageSetting = new PageSetting(null, PageID, null, UserID, null);
        pageSetting.getPageToken(PageID, UserID).then(function (_PageToken) {
            pageSetting.suspendFunctions(UserID, PageID, _PageToken).then(function () {
                res.json({ "Message": "已暫停專頁Eilis功能" });
            }).catch(function (err) {
                res.json({ "Error": "暫停專頁功能出現錯誤, 原因:" + err });
            });
        }).catch(function (err) {
            res.json({ "Error": "取得專頁Token出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入使用者或頁面ID" });
    }
}

exports._SuspendFunctionsDev = function (req, res) {
    var UserID = req.query.UserID;
    var PageID = req.query.PageID;
    if (UserID && PageID) {
        var pageSetting = new PageSetting(null, PageID, null, UserID, null);
        pageSetting.getPageToken(PageID, UserID).then(function (_PageToken) {
            pageSetting.suspendFunctions(UserID, PageID, _PageToken).then(function () {
                res.json({ "Message": "已暫停專頁Eilis功能" });
            }).catch(function (err) {
                res.json({ "Error": "暫停專頁功能出現錯誤, 原因:" + err });
            });
        }).catch(function (err) {
            res.json({ "Error": "取得專頁Token出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入使用者或頁面ID" });
    }
}

// 復原所有功能(對單一專頁)
exports._RestartFunctions = function (req, res) {
    var UserID = req.body.UserID;
    var PageID = req.body.PageID;
    if (UserID && PageID) {
        var pageSetting = new PageSetting(null, PageID, null, UserID, null);
        pageSetting.getPageToken(PageID, UserID).then(function (_PageToken) {
            pageSetting.restartFunctions(UserID, PageID, _PageToken).then(function () {
                res.json({ "Message": "已重新啟動專頁Eilis功能" });
            }).catch(function (err) {
                res.json({ "Error": "重新啟動專頁功能出現錯誤, 原因:" + err });
            });
        }).catch(function (err) {
            res.json({ "Error": "取得專頁Token出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入使用者或頁面ID" });
    }
}

exports._RestartFunctionsDev = function (req, res) {
    var UserID = req.query.UserID;
    var PageID = req.query.PageID;
    if (UserID && PageID) {
        var pageSetting = new PageSetting(null, PageID, null, UserID, null);
        pageSetting.getPageToken(PageID, UserID).then(function (_PageToken) {
            pageSetting.restartFunctions(UserID, PageID, _PageToken).then(function () {
                res.json({ "Message": "已重新啟動專頁Eilis功能" });
            }).catch(function (err) {
                res.json({ "Error": "重新啟動專頁功能出現錯誤, 原因:" + err });
            });
        }).catch(function (err) {
            res.json({ "Error": "取得專頁Token出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入使用者或頁面ID" });
    }
}

// 取得用戶付費方案種類
exports._GetUserPlan = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        var pageSetting = new PageSetting(null, null, null, UserID, null);
        pageSetting.getUserPlan(pageSetting.userID).then(function (_UserPlanData) {
            res.json(_UserPlanData);
        }).catch(function (err) {
            res.json({ "Error": "取得用戶付費方案出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入使用者ID" });
    }
}

// 用戶切換付費方案
exports._ChangePlan = function (req, res) {
    var UserID = req.body.UserID;
    var ProductType = req.body.ProductType;
    if (UserID && ProductType) {
        var pageSetting = new PageSetting(null, null, null, UserID, null);
        pageSetting.changePlan(pageSetting.userID, ProductType).then(function () {
            res.json({ "Message": "已切換用戶付費方案" });
        }).catch(function (err) {
            res.json({ "Error": "切換用戶付費方案出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入使用者ID或方案代號" });
    }
}

// 設定新付費方案
exports._SetNewPlan = function (req, res) {
    var PlanName = req.body.PlanName;
    var PlanDetail = req.body.PlanDetail;
    var BroadcastPlanDetail = req.body.BroadcastPlanDetail;
    // 月費方案
    if (PlanName && PlanDetail) {
        var pageSetting = new PageSetting(null, null, null, null, null);
        pageSetting.setNewPlan(PlanName, PlanDetail).then(function () {
            res.json({ "Message": "設定新付費方案成功" });
        }).catch(function (err) {
            res.json({ "Error": "設定新付費方案出現錯誤, 原因:" + err });
        });
    }
    // 廣播加值方案
    else if (PlanName && BroadcastPlanDetail) {
        var pageSetting = new PageSetting(null, null, null, null, null);
        pageSetting.setNewBroadcastPlan(PlanName, BroadcastPlanDetail).then(function () {
            res.json({ "Message": "設定新廣播付費方案成功" });
        }).catch(function (err) {
            res.json({ "Error": "設定新廣播付費方案出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

// 取得方案內容
exports._GetPlanContent = function (req, res) {
    var PlanName = req.body.PlanName || "All";
    if (PlanName) {
        var pageSetting = new PageSetting(null, null, null, null, null);
        pageSetting.getPlanContent(PlanName).then(function (_Content) {
            res.json(_Content);
        }).catch(function (err) {
            res.json({ "Error": "取得方案內容出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

// 更新方案內容
exports._UpdatePlan = function (req, res) {
    var PlanName = req.body.PlanName;
    var PlanDetail = req.body.PlanDetail;
    var BroadcastPlanDetail = req.body.BroadcastPlanDetail;
    // 月費方案
    if (PlanName && PlanDetail) {
        var pageSetting = new PageSetting(null, null, null, null, null);
        pageSetting.updatePlan(PlanName, PlanDetail).then(function () {
            res.json({ "Message": "更新方案內容成功" });
        }).catch(function (err) {
            res.json({ "Error": "更新方案內容出現錯誤, 原因:" + err });
        });
    }
    // 廣播加值方案
    else if (PlanName && BroadcastPlanDetail) {
        var pageSetting = new PageSetting(null, null, null, null, null);
        pageSetting.updateBroadcastPlan(PlanName, BroadcastPlanDetail).then(function () {
            res.json({ "Message": "更新廣播付費方案成功" });
        }).catch(function (err) {
            res.json({ "Error": "更新廣播付費方案出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

// 開啟非客服時間回覆
exports._TurnOnOfficeSetting = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        var pageSetting = new PageSetting(null, PageID, null, null, null);
        pageSetting.turnOnOfficeSetting(pageSetting.pageID).then(function () {
            res.json({ "Message": "已開啟非客服時間回覆" });
        }).catch(function (err) {
            res.json({ "Error": "開啟非客服時間回覆出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入頁面ID" });
    }
}

// 關閉非客服時間回覆
exports._TurnOffOfficeSetting = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        var pageSetting = new PageSetting(null, PageID, null, null, null);
        pageSetting.turnOffOfficeSetting(pageSetting.pageID).then(function () {
            res.json({ "Message": "已關閉非客服時間回覆" });
        }).catch(function (err) {
            res.json({ "Error": "關閉非客服時間回覆出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入頁面ID" });
    }
}