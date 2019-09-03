var PageAdmin = require('./model.js');
var PageSetting = require('../page_setting/model.js');
var db = require('../../db/firebase_db.js');
var requestPromise = require('request-promise');
var Q = require('q');

//取得FB粉專所有管理員, 小編資訊
exports._GetPageRoles = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageBasicData) {
            if (_PageBasicData != null) {
                var PageToken = _PageBasicData.PageToken;
                GetPageRoles(PageID, PageToken).then(function (_Result) {
                    res.json(_Result);
                }).catch(function (err) {
                    res.json({ "Error": "查詢粉專所有管理員與小編出現錯誤, 原因:" + err });
                })
            }
            else {
                res.json({ "Error": "沒有找到對應的粉專" });
            }
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

//取得粉專目前主管理員, 共用管理員資訊
exports._GetPageAdmin = function (req, res) {
    var PageID = req.body.PageID;
    var PageName = req.body.PageName;
    if (PageID) {
        var pageAdmin = new PageAdmin(null, PageID, null);
        pageAdmin.getPageAdminByPageID(pageAdmin.pageID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "查詢目前粉專管理者出現錯誤, 原因:" + err });
        });
    }
    else if (PageName) {
        var pageAdmin = new PageAdmin(PageName, null, null);
        pageAdmin.getPageAdminByPageName(pageAdmin.pageName).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "查詢目前粉專管理者出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，無法查詢目前粉專管理者" });
    }
}

//取得主管理員目前開放共用粉專, 共用管理員資訊
exports._GetAdminSetting = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        var pageAdmin = new PageAdmin(null, null, UserID);
        pageAdmin.getAdminSetting(pageAdmin.userID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "取得主管理員目前開放共用粉專, 共用管理員資訊出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，無法取得主管理員目前開放共用粉專, 共用管理員資訊" });
    }
}
//設定共用管理員到特定粉專
exports._SetPageEditor = function (req, res) {
    var PageID = req.body.PageID;
    var UserID = req.body.UserID;
    if (PageID && UserID) {
        var pageAdmin = new PageAdmin(null, PageID, UserID);
        pageAdmin.setPageEditor(pageAdmin.pageID, pageAdmin.userID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "設定共用管理員到特定粉專出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，無法設定共用管理員到特定粉專" });
    }
}
//移除特定粉專的共用管理員
exports._RemovePageEditor = function (req, res) {
    var PageID = req.body.PageID;
    var UserID = req.body.UserID;
    if (PageID && UserID) {
        var pageAdmin = new PageAdmin(null, PageID, UserID);
        pageAdmin.removePageEditor(pageAdmin.pageID, pageAdmin.userID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "移除特定粉專的共用管理員出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，無法移除特定粉專的共用管理員" });
    }
}
//轉換粉專主管理者
exports._ChangePageAdmin = function (req, res) {
    var PageID = req.body.PageID;
    var UserID = req.body.UserID;
    if (PageID && UserID) {
        try {
            // 檢查新用戶是否已註冊Eilis
            db._onValuePromise("EilisUser", UserID).then(function (_UserData) {
                if (_UserData != null) {
                    var NewAdminUserName = _UserData.UserBasicData.UserName;
                    // 取得粉專現在管理者
                    db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageData) {
                        var FormerAdminUserID = _PageData.PageAdmin.UserID;
                        // 轉換管理者(EilisFB)
                        var EilisFBAdminData = {
                            "UserID": UserID,
                            "UserName": NewAdminUserName
                        }
                        db._update("EilisFB/" + PageID + "/PageBasicData", "PageAdmin", EilisFBAdminData).then(function () {
                            // 轉換原管理者粉專狀態為已被註冊(EilisUser/AllPageData)
                            db._onValuePromise("EilisUser", FormerAdminUserID).then(function (_FormerAdminData) {
                                var PageStatus;
                                var FormerAdminAllPageData = _FormerAdminData["UserBasicData"]["AllPageData"]["data"];
                                FormerAdminAllPageData.map(function (_PageData, index) {
                                    if (_PageData.id == PageID) {
                                        PageStatus = _PageData.status;
                                        _UserData.UserBasicData.AllPageData.data.map(function(_NewAdminPageData, _Index){
                                            if(_NewAdminPageData.id == PageID){
                                                FormerAdminAllPageData[index]["status"] = _NewAdminPageData.status;
                                            }
                                        })
                                        db._update("EilisUser/" + FormerAdminUserID + "/UserBasicData/AllPageData", "data", FormerAdminAllPageData).then(function () {
                                            // 轉換新管理者粉專狀態為原粉專狀態(EilisUser/AllPageData)
                                            var NewAdminAllPageData = _UserData.UserBasicData.AllPageData.data;
                                            NewAdminAllPageData.map(function (_PageData, index) {
                                                if (_PageData.id == PageID) {
                                                    NewAdminAllPageData[index]["status"] = PageStatus;
                                                    db._update("EilisUser/" + UserID + "/UserBasicData/AllPageData", "data", NewAdminAllPageData).then(function () {
                                                        // 確認是否有選擇付費方案，預設帶入 1.舊管理者方案 或 2.699方案
                                                        if (!_UserData.hasOwnProperty("ProductInfo")) {
                                                            var pageSetting = new PageSetting(null, PageID, null, UserID, null);
                                                            var ProductType = (_FormerAdminData.hasOwnProperty("ProductInfo")) ? _FormerAdminData["ProductInfo"]["ProductLevel"] : "ECA";
                                                            pageSetting.addServiceProduct(pageSetting.userID, pageSetting.pageID, ProductType).then(function () {
                                                                res.json({ "Message": "成功轉換粉專管理者!" });
                                                            })
                                                        }
                                                        else {
                                                            res.json({ "Message": "成功轉換粉專管理者!" });
                                                        }
                                                    })
                                                }
                                            })
                                        })
                                    }
                                })
                            })
                        })
                    })
                }
            })
        }
        catch (err) {
            res.json({ "Error": "轉換管理員出現錯誤, 原因:" + err });
        }
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

//取得所有粉專管理者Email資訊
exports._GetAdminEmail = function (req, res) {
    db._onValuePromiseWithoutChild("EilisFB").then(function (_PageData) {
        var PageIDArr = Object.getOwnPropertyNames(_PageData);
        var PromiseArr = [];
        PageIDArr.map(function (_PageID, _Index) {
            if (_PageData[_PageID].hasOwnProperty("PageBasicData")) {
                var PageName = _PageData[_PageID]["PageBasicData"]["PageName"];
                var AdminName = _PageData[_PageID]["PageBasicData"]["PageAdmin"]["UserName"];
                var UserID = _PageData[_PageID]["PageBasicData"]["PageAdmin"]["UserID"];
                PromiseArr.push(getAdminEmail(_PageID, PageName, UserID, AdminName, _Index));
            }
        })

        Q.all(PromiseArr).then(function (_result) {
            res.send(_result);
        }).catch(function(err){
            res.json({"Error":"取得所有粉專管理者Email資訊發生錯誤，原因：" + err});
        })
    }).catch(function(err){
        res.json({"Error":"取得所有粉專管理者Email資訊發生錯誤，原因：" + err});
    })
}

// 取得粉專Token狀態
function getAdminEmail(pageID, pageName, userID, adminName, index) {
    var deferred = Q.defer();
    db._onValuePromise("EilisUser/" + userID, "UserBasicData").then(function (_UserBasicData) {
        if (_UserBasicData != null) {
            deferred.resolve({
                "AdminName": adminName,
                "PageName": pageName,
                "Email": _UserBasicData.Email || "用戶沒有Email"
            })
        }
        else {
            deferred.resolve({
                "AdminName": adminName,
                "PageName": pageName,
                "Email": "用戶沒有Email"
            })
        }
    }).catch(function (err) {
        deferred.resolve({
            "AdminName": adminName,
            "PageName": pageName,
            "Email": "用戶沒有Email"
        })
    })

    return deferred.promise;
}

function GetPageRoles(pageID, pageToken) {
    var options = {
        uri: 'https://graph.facebook.com/' + pageID + '/roles',
        qs: { access_token: pageToken },
        headers: {
            'User-Agent': 'Request-Promise'
        },
        method: 'GET',
        json: true
    };

    return requestPromise(options)
        .then(function (parsedBody) {
            return Promise.resolve(parsedBody);
        })
        .catch(function (err) {
            return Promise.reject("Error:" + err);
        });
}