var db = require('../../db/firebase_db.js');
var Q = require("q");
var requestPromise = require('request-promise');
var crypto = require('crypto');
const TimeNow = require('../../tool/TimeNow');
const EscapeLetter = require('../../tool/EscapeLetter');

var PageAdmin = function (pageName, pageID, userID) {
    this.pageName = pageName;
    this.pageID = pageID;
    this.userID = userID;
}

// 查詢目前粉專管理者(透過粉專ID)
PageAdmin.prototype.getPageAdminByPageID = function (pageID) {
    var Ref = "EilisFB/" + pageID + "/PageBasicData";
    var ChildName = "PageAdmin";
    return new Promise((resolve, reject) => {
        return db._onValuePromise(Ref, ChildName).then(function (_AdminData) {
            return resolve(_AdminData);
        }).catch(function (err) {
            return reject(err);
        })
    });
}

// 查詢目前粉專管理者(透過粉專名稱)
PageAdmin.prototype.getPageAdminByPageName = function (pageName) {
    var Ref = "EilisFB";
    return new Promise((resolve, reject) => {
        return db._onValuePromiseWithoutChild(Ref).then(function (_FBData) {
            Object.keys(_FBData).forEach(function (_PageID, _Index) {
                if (_FBData[_PageID]["PageBasicData"]["PageName"] == pageName) {
                    var AdminData = _FBData[_PageID]["PageBasicData"]["PageAdmin"];
                    return resolve(AdminData);
                }
                else if (_Index == Object.keys(_FBData).length - 1) {
                    return reject("沒有找到對應的粉專資料");
                }
            })
        }).catch(function (err) {
            return reject(err);
        })
    });
}

//取得主管理員目前開放共用粉專, 共用管理員資訊
PageAdmin.prototype.getAdminSetting = function (userID) {
    return new Promise((resolve, reject) => {
        //取得主管理者管理人數
        db._onValuePromise("EilisUser/" + userID + "/ProductInfo", "ProductFunction").then(function (_ProductFunction) {
            if (_ProductFunction != null && _ProductFunction.hasOwnProperty("EilisEditorLimit") && _ProductFunction.hasOwnProperty("EilisEditorTotal")) {
                var EilisEditorLimit = _ProductFunction["EilisEditorLimit"];
                var EilisEditorTotal = _ProductFunction["EilisEditorTotal"];
                var ReturnData = {
                    "EilisEditorLimit": EilisEditorLimit,
                    "EilisEditorTotal": EilisEditorTotal,
                    "PageEditorData": "None"
                }
                if (EilisEditorTotal == 0) {
                    return resolve(ReturnData);
                }
                else {
                    //取得"共用管理者"人數不為0的粉專清單
                    db._onValuePromise("EilisUser/" + userID + "/UserBasicData/AllPageData", "data").then(function (_AllPageData) {
                        if (_AllPageData != null) {
                            var PromiseArr = [];
                            _AllPageData.map(function (_PageData, _Index) {
                                if (_PageData.status != "Registered Page" && _PageData.status != "Not Enabled Page" && _PageData.status != "Editable Page") {
                                    //取得各粉專共用管理員
                                    PromiseArr.push(GetPageEditors(_PageData["id"]));
                                }
                            })
                            var Step1 = Q.all(PromiseArr);
                            Step1.then(function (_Results) {
                                _Results.map(function(_ResultData, _Index){
                                    if(_ResultData["PageEditor"] == "None"){
                                        _Results.splice(_Index, 1);
                                    }
                                })
                                ReturnData.PageEditorData = _Results;
                                return resolve(ReturnData);
                            }).catch(function (err) {
                                return reject(err);
                            })
                        }
                    }).catch(function (err) {
                        return reject(err);
                    })
                }
            }
            else {
                return reject("此用戶還沒有加入共用管理者設定喔!");
            }
        }).catch(function (err) {
            return reject(err);
        })
    })
}

//設定共用管理員到特定粉專
PageAdmin.prototype.setPageEditor = function (pageID, userID) {
    return new Promise((resolve, reject) => {
        //確認新共用管理者是否註冊Eilis
        db._onValuePromise("EilisUser/" + userID, "UserBasicData").then(function (_UserBasicData) {
            if (_UserBasicData != null) {
                var UserName = _UserBasicData.UserName;
                //從粉專取得主管理者ID
                db._onValuePromise("EilisFB/" + pageID + "/PageBasicData", "PageAdmin").then(function (_AdminData) {
                    if (_AdminData != null) {
                        var AdminID = _AdminData.UserID;
                        //確認主管理者管理人數
                        db._onValuePromise("EilisUser/" + AdminID + "/ProductInfo", "ProductFunction").then(function (_ProductFunction) {
                            if (_ProductFunction != null && _ProductFunction.hasOwnProperty("EilisEditorLimit") && _ProductFunction.hasOwnProperty("EilisEditorTotal")) {
                                var EditorLimit = _ProductFunction["EilisEditorLimit"];
                                var TotalEditors = _ProductFunction["EilisEditorTotal"];
                                // 可以再加入新共用管理員
                                if (TotalEditors <= EditorLimit) {
                                    //加入設定至粉專
                                    db._onValuePromise("EilisFB/" + pageID, "PageBasicData").then(function (_PageBasicData) {
                                        var AlreadyAdded = false;
                                        if (!_PageBasicData.hasOwnProperty("PageEditor")) {
                                            _PageBasicData["PageEditor"] = [{ "UserID": userID, "UserName": UserName }];
                                        }
                                        else {
                                            _PageBasicData["PageEditor"].map(function (_EditerData, _Index) {
                                                if (_EditerData.UserID == userID) {
                                                    AlreadyAdded = true;
                                                    return reject("此用戶已經是共用管理者囉!");
                                                }
                                                else if (_Index == _PageBasicData["PageEditor"].length - 1) {
                                                    _PageBasicData["PageEditor"].push({ "UserID": userID, "UserName": UserName });
                                                }
                                            })
                                        }
                                        if (!AlreadyAdded) {
                                            //將粉專狀態從已註冊改為共用
                                            db._onValuePromise("EilisUser/" + userID + "/UserBasicData/AllPageData", "data").then(function (_AllPageData) {
                                                if (_AllPageData != null) {
                                                    var IsPageEditorOrAdmin = false;
                                                    _AllPageData.map(function (_PageData, _Index) {
                                                        if (_PageData.id == pageID) {
                                                            IsPageEditorOrAdmin = true;
                                                            _AllPageData[_Index]["status"] = "Editable Page";
                                                        }
                                                    })
                                                    if (IsPageEditorOrAdmin == true) {
                                                        db._update("EilisFB/" + pageID, "PageBasicData", _PageBasicData).then(function () {
                                                            db._update("EilisUser/" + userID + "/UserBasicData/AllPageData", "data", _AllPageData).then(function () {
                                                                //更新主管理者管理人數
                                                                db._transactionCount("EilisUser/" + AdminID + "/ProductInfo/ProductFunction/EilisEditorTotal", 1, function () {
                                                                    return resolve({ "Message": "已成功加入共用管理員" });
                                                                }).catch(function (err) {
                                                                    return reject(err);
                                                                })
                                                            }).catch(function (err) {
                                                                return reject(err);
                                                            })
                                                        }).catch(function (err) {
                                                            return reject(err);
                                                        })
                                                    }
                                                    else {
                                                        return reject("此用戶目前沒有管理這個粉絲專頁喔!");
                                                    }
                                                }
                                            }).catch(function (err) {
                                                return reject(err);
                                            })
                                        }
                                    }).catch(function (err) {
                                        return reject(err);
                                    })
                                }
                                // 共用管理員已經達到額滿
                                else {
                                    return reject("主管理者的共用管理員額度已經不足囉!");
                                }
                            }
                            else {
                                return reject("您的粉專還沒有加入共用管理者設定喔!");
                            }
                        }).catch(function (err) {
                            return reject(err);
                        })
                    }
                }).catch(function (err) {
                    return reject(err);
                })
            }
            else {
                return reject("此用戶ID尚未註冊Eilis!");
            }
        }).catch(function (err) {
            return reject(err);
        })
    })
}

//移除特定粉專的共用管理員
PageAdmin.prototype.removePageEditor = function (pageID, userID) {
    return new Promise((resolve, reject) => {
        //更新設定至粉專
        db._onValuePromise("EilisFB/" + pageID, "PageBasicData").then(function (_PageBasicData) {
            if (_PageBasicData.hasOwnProperty("PageEditor")) {
                _PageBasicData.PageEditor.map(function (_EditorData, _Index) {
                    if (_EditorData.UserID == userID) {
                        _PageBasicData.PageEditor.splice(_Index, 1);
                    }
                })
                db._update("EilisFB/" + pageID, "PageBasicData", _PageBasicData).then(function () {
                    //將粉專狀態從共用改為已註冊
                    db._onValuePromise("EilisUser/" + userID + "/UserBasicData/AllPageData", "data").then(function (_AllPageData) {
                        if (_AllPageData != null) {
                            _AllPageData.map(function (_PageData, _Index) {
                                if (_PageData.id == pageID) {
                                    _AllPageData[_Index]["status"] = "Registered Page";
                                }
                            })
                        }
                        db._update("EilisUser/" + userID + "/UserBasicData/AllPageData", "data", _AllPageData).then(function () {
                            //從粉專取得主管理者ID
                            var AdminID = _PageBasicData.PageAdmin.UserID;
                            //更新主管理者管理人數
                            db._transactionCount("EilisUser/" + AdminID + "/ProductInfo/ProductFunction/EilisEditorTotal", -1, function () {
                                return resolve({ "Message": "已成功移除共用管理員" });
                            }).catch(function (err) {
                                return reject(err);
                            })
                        }).catch(function (err) {
                            return reject(err);
                        })
                    }).catch(function (err) {
                        return reject(err);
                    })
                }).catch(function (err) {
                    return reject(err);
                })
            }
            else {
                return reject("此粉專已經沒有設定共用管理員囉!");
            }
        }).catch(function (err) {
            return reject(err);
        })
    })
}


var GetPageEditors = function (pageID) {
    var deferred = Q.defer();
    db._onValuePromise("EilisFB/" + pageID, "PageBasicData").then(function (_PageBasicData) {
        if (_PageBasicData != null && _PageBasicData.hasOwnProperty("PageEditor")) {
            var ReturnData = {
                "PageID": _PageBasicData.PageID,
                "PageName": _PageBasicData.PageName,
                "PageEditor": _PageBasicData.PageEditor
            }
            deferred.resolve(ReturnData);
        }
        else {
            var ReturnData = {
                "PageID": _PageBasicData.PageID,
                "PageName": _PageBasicData.PageName,
                "PageEditor": "None"
            }
            deferred.resolve(ReturnData);
        }
    }).catch(function (err) {
        deferred.reject("取得粉專共用管理者資訊失敗, 原因:" + err);
    });
    return deferred.promise;
}

module.exports = PageAdmin;