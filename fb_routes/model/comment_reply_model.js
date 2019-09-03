const db = require('../../db/firebase_db.js');
const errorLog = require('../../tool/ErrorLog.js');
const FB = require('fb');
const requestPromise = require('request-promise');
const Q = require('q');

var CommentReply = function (pageID, postID, commentID, message, userID, userName) {
    this.PageID = pageID;
    // 文章ID
    this.PostID = postID;
    // 用戶留言ID
    this.CommentID = commentID;
    // 用戶留言
    this.Message = message;
    this.UserID = userID;
    this.UserName = userName;
}

// 關鍵字回覆
CommentReply.prototype.keywordsReply = function (PageID, PostID, CommentID, Message, UserID, UserName) {
    db._onValuePromise('EilisKeywords', PageID).then(function (_KeywordsData) {
        // 先確認是否有開啟PostID的Status = "on" 設定
        if (_KeywordsData != null && _KeywordsData.hasOwnProperty(PostID) && (!_KeywordsData[PostID].hasOwnProperty("Status") || (_KeywordsData[PostID].hasOwnProperty("Status") && _KeywordsData[PostID]["Status"] == "on"))) {
            var PromiseArr = [];
            // 有活動表單 => 寫入所有留言
            if (_KeywordsData[PostID].hasOwnProperty("SheetID")) {
                var PostData = {
                    "SheetID": _KeywordsData[PostID]["SheetID"],
                    "CommentID": CommentID,
                    "UserID": UserID,
                    "UserName": UserName,
                    "Message": Message
                }
                // 寫入留言，取得留言在第幾列
                addNewCommentToSheet(PostData).then(function (_Result) {
                    // 檢查留言是否觸發功能
                    TriggerCommentModule(_KeywordsData, Message, PostID, PageID, CommentID, UserID, UserName, PostData.SheetID, _Result.UpdateAtRow).then(function (_ResultData) {
                        console.log(JSON.stringify(_ResultData))
                    }).catch(function (err) {
                        console.error(err);
                    });
                }).catch(function (err) {
                    console.error(err);
                })
            }
            // 沒有活動表單 => 檢查留言是否觸發功能
            else {
                TriggerCommentModule(_KeywordsData, Message, PostID, PageID, CommentID, UserID, UserName, null, null).then(function (_ResultData) {
                    console.log(JSON.stringify(_ResultData))
                }).catch(function (err) {
                    console.error(err);
                });
            }
        }
        else {
            return;
        }
    })
}

// API關鍵字回覆(圖片或留言)
CommentReply.prototype.APIkeywordsReply = function (PageID, PostID, CommentID, Message) {
    db._onValuePromise("EilisFB/" + PageID + "/EilisAPIComment", PostID).then(function (_APICommentSetting) {
        if (_APICommentSetting != null) {
            //取得客戶對接的URL
            if (_APICommentSetting.hasOwnProperty("Status") && _APICommentSetting.Status.toLowerCase() == "on" && _APICommentSetting.hasOwnProperty("Keywords") && _APICommentSetting.hasOwnProperty("Url")) {
                //檢查留言是否出現關鍵字
                var Keywords = _APICommentSetting.Keywords;
                Keywords.map(function (_Keyword, _Index) {
                    //將關鍵字加入Request對接URL呼叫
                    if (_fullWidthToHalfWidth(Message).toLowerCase().indexOf(_fullWidthToHalfWidth(_Keyword).toLowerCase()) != -1) {
                        var Url = _APICommentSetting.Url;
                        ReplySettingRequest(PostID, _Keyword, Url).then(function (_ResponseData) {
                            //檢查回傳留言格式
                            if (_ResponseData.hasOwnProperty("Type")) {
                                //文字回覆留言
                                if (_ResponseData.Type == "Message" && _ResponseData.hasOwnProperty("Message")) {
                                    var ReplyBody = { "message": _ResponseData.Message };
                                    db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageBasicData) {
                                        var PageToken = _PageBasicData.PageToken;
                                        ReplyComment(CommentID, PageToken, ReplyBody).then(function (_ResultData) {
                                            console.log(JSON.stringify(_ResultData))
                                        }).catch(function (err) {
                                            console.error(err);
                                        })
                                    }).catch(function (err) {
                                        errorLog._ErrorLogToDB(err);
                                    })
                                }
                                //圖片回覆留言
                                else if (_ResponseData.Type == "Image" && _ResponseData.hasOwnProperty("Link")) {
                                    var ReplyBody = { "attachment_url": _ResponseData.Link };
                                    db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageBasicData) {
                                        var PageToken = _PageBasicData.PageToken;
                                        ReplyComment(CommentID, PageToken, ReplyBody).then(function (_ResultData) {
                                            console.log(JSON.stringify(_ResultData))
                                        }).catch(function (err) {
                                            console.error(err);
                                        })
                                    }).catch(function (err) {
                                        errorLog._ErrorLogToDB(err);
                                    })
                                }
                                else {
                                    return;
                                }
                            }
                            else {
                                return;
                            }
                        }).catch(function (err) {
                            console.error(err);
                        });
                    }
                })
            }
        }
        else {
            return;
        }
    })
}

// 觸發留言模組設定
function TriggerCommentModule(KeywordsData, Message, PostID, PageID, CommentID, UserID, UserName, SheetID, InsertRowAt) {
    var deferred = Q.defer();
    var PromiseArr = [];
    // 取得PO文的POST模組設定，用戶留言推文有包含對應關鍵字，才會繼續觸發私訊、回覆留言等底下動作
    PromiseArr.push(getKeywordSetting(KeywordsData, Message, PostID, PageID, CommentID));
    var Step1 = Q.all(PromiseArr);
    // 有符合的關鍵字觸發條件
    Step1.then(function (_result) {
        PromiseArr = [];
        if (_result.length != 0) {
            var SettingData = _result[0];
            // 私訊回覆文字
            var ReplyMessage = SettingData.ReplyMessage;
            // 自動回覆底下推文留言
            var FollowComment = SettingData.FollowComment;
            var PageToken = SettingData.PageToken;
            // 有設定才觸發私訊回覆文字
            if (ReplyMessage != "NoReplyMessage") {
                // 扣除廣播/私訊點數設定，設定為off時會扣除點數，舊文章預設為on（不扣除）
                var FreeMessage = (KeywordsData[PostID].hasOwnProperty("FreeMessage")) ? KeywordsData[PostID]["FreeMessage"] : "on";
                PromiseArr.push(privateReplyMessage(CommentID, ReplyMessage, PageToken, SheetID, InsertRowAt, PageID, FreeMessage));
            }
            // 有設定才觸發回覆底下推文留言
            if (FollowComment != "NoFollowComment") {
                PromiseArr.push(commentResponse(CommentID, FollowComment, PageToken, SheetID, InsertRowAt));
            }
            var Step2 = Q.all(PromiseArr);
            Step2.then(function (_result) {
                console.log("已成功回覆關鍵字留言 / 私訊");
                PromiseArr = [];
                // 完成所有流程，寫入UserID等用戶資料到DB
                PromiseArr.push(updateUserDataToDB(PageID, PostID, CommentID, UserID, UserName));
                var Step3 = Q.all(PromiseArr);
                Step3.then(function (_result) {
                    deferred.resolve(_result);
                })
            })
        }
        else {
            deferred.reject("用戶留言沒有符合粉專關鍵字設定");
        }
    }).catch(function (err) {
        deferred.reject(err);
    })
    return deferred.promise;
}

// 檢查留言是否可觸發對應文章關鍵字設定
function getKeywordSetting(_KeywordsData, Message, PostID, PageID, CommentID) {
    console.log("取得粉專關鍵字設定...");
    var deferred = Q.defer();
    var ResultSettingData = null;
    var HasAllPassKeyword = false;
    var MinKeywordIndex;
    // 依序取得所有關鍵字設定
    _KeywordsData[PostID]["Settings"].map(function (_SettingData, _Index) {
        // 將 留言 和 資料庫設定關鍵字 的：
        // 1.全型＋符號，轉換為半型+符號
        // 2.英文部分統一轉為小寫
        if (_fullWidthToHalfWidth(Message).toLowerCase().indexOf(_fullWidthToHalfWidth(_SettingData.KeyWord).toLowerCase()) != -1 || _SettingData.KeyWord == "AllKeywordShallPass") {
            var SettingData = {
                "Keyword": _SettingData.KeyWord,
                "ReplyMessage": _SettingData.ReplyMessage,
                "FollowComment": _SettingData.FollowComment
            };

            if (_SettingData.KeyWord == "AllKeywordShallPass") {
                HasAllPassKeyword = true;
                ResultSettingData = SettingData;
            }
            else if (HasAllPassKeyword == false) {
                var MessageKeywordIndex = _fullWidthToHalfWidth(Message).toLowerCase().indexOf(_fullWidthToHalfWidth(_SettingData.KeyWord).toLowerCase());
                if (ResultSettingData == null) {
                    MinKeywordIndex = MessageKeywordIndex;
                    ResultSettingData = SettingData;
                }
                else if (MessageKeywordIndex < MinKeywordIndex) {
                    MinKeywordIndex = MessageKeywordIndex;
                    ResultSettingData = SettingData;
                }
            }
            if (_Index == _KeywordsData[PostID]["Settings"].length - 1) {
                return db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageBasicData) {
                    ResultSettingData["PageToken"] = _PageBasicData.PageToken;
                    deferred.resolve(ResultSettingData);
                });
            }
        }
        else if (_Index == _KeywordsData[PostID]["Settings"].length - 1) {
            if (ResultSettingData != null) {
                return db._onValuePromise("EilisFB/" + PageID, "PageBasicData").then(function (_PageBasicData) {
                    ResultSettingData["PageToken"] = _PageBasicData.PageToken;
                    deferred.resolve(ResultSettingData);
                });
            }
            else {
                console.log("沒有找到對應關鍵字設定");
                deferred.reject("沒有對應關鍵字");
            }
        }
    })
    return deferred.promise;
}

// 留言關鍵字觸發私訊回覆文字訊息
function privateReplyMessage(CommentID, ReplyMessage, PageToken, SheetID, InsertRowAt, PageID, FreeMessage) {
    var deferred = Q.defer();
    FB.setAccessToken(PageToken);
    FB.api(
        "/" + CommentID + "/private_replies",
        "POST", { message: ReplyMessage },
        function (response) {
            if (response && !response.error) {
                if (SheetID != null && InsertRowAt != null) {
                    var InsertColumnAt = 5;
                    var PostData = {
                        "SheetID": SheetID,
                        "Row": InsertRowAt,
                        "Column": InsertColumnAt,
                        "Data": "✓"
                    }
                    UpdateSheetColumnData(PostData).then(function () {
                        //扣除廣播/私訊點數
                        if (FreeMessage == "off") {
                            DeductBroadcastQuota(PageID).then(function () {
                                deferred.resolve("Succeed");
                            }).catch(function (err) {
                                console.error("關鍵字私訊回覆功能扣除廣播/私訊點數失敗，原因:" + err);
                                deferred.reject(err);
                                return;
                            })
                        }
                        // 不扣除點數
                        else {
                            deferred.resolve("Succeed");
                        }
                    }).catch(function (err) {
                        console.error("關鍵字私訊回覆功能更新表單失敗，原因:" + JSON.stringify(err));
                        deferred.reject(JSON.stringify(err));
                        return;
                    })
                }
                else {
                    //扣除廣播/私訊點數
                    deferred.resolve("Succeed");
                }
            }
            else {
                console.error("關鍵字私訊回覆功能失敗，原因:" + JSON.stringify(response));
                deferred.reject(JSON.stringify(response));
                return;
            }
        }
    );
    return deferred.promise;
}

// 在用戶貼文留言下, 觸發回覆一則粉專管理者留言
function commentResponse(commentID, followComment, pageToken, SheetID, InsertRowAt) {
    var deferred = Q.defer();
    var options = {
        uri: 'https://graph.facebook.com/' + commentID + '/comments?access_token=' + pageToken,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        method: 'POST',
        body: {
            "message": followComment
        },
        json: true
    };
    return requestPromise(options)
        .then(function (parsedBody) {
            if (SheetID != null && InsertRowAt != null) {
                var InsertColumnAt = 6;
                var PostData = {
                    "SheetID": SheetID,
                    "Row": InsertRowAt,
                    "Column": InsertColumnAt,
                    "Data": "✓"
                }
                UpdateSheetColumnData(PostData).then(function () {
                    deferred.resolve("Succeed");
                }).catch(function (err) {
                    console.error("關鍵字私訊回覆功能更新表單失敗，原因:" + JSON.stringify(err));
                    deferred.reject(JSON.stringify(err));
                    return;
                })
            }
            else {
                deferred.resolve("Succeed");
            }
        })
        .catch(function (err) {
            console.error("關鍵字回覆關鍵字留言失敗, 原因:" + err);
            deferred.reject(err);
        });
    return deferred.promise;
}

// 更新用戶資料到DB
function updateUserDataToDB(PageID, PostID, CommentID, UserID, UserName) {
    var deferred = Q.defer();
    var CommentData = {
        "CommentID": CommentID,
        "UserID": UserID,
        "UserName": UserName,
        "Registered": false,
        "DateTime": _dateToDBString(new Date(), "DateTime")
    }
    db._update("EilisComment/" + PageID + "/" + PostID, UserID, CommentData).then(function (_Result) {
        console.log("更新留言互動用戶資料成功:" + _Result);
        deferred.resolve({ "succeed": _Result });
    }).catch(function (err) {
        console.log("更新留言互動用戶資料失敗，原因:" + err);
        deferred.reject(err);
        return;
    });
    return deferred.promise;
}

// 呼叫活動模組, 紀錄用戶對文章的留言到活動表單
function addNewCommentToSheet(postData) {
    return new Promise((resolve, reject) => {
        var options = {
            uri: 'https://mavis-activity.herokuapp.com/api/addNewComment',
            headers: {
                'User-Agent': 'Request-Promise'
            },
            method: 'POST',
            body: postData,
            json: true
        };

        requestPromise(options)
            .then(function (parsedBody) {
                resolve(parsedBody);
            })
            .catch(function (err) {
                console.error("寫入留言到活動模組表單失敗, 原因:" + err);
                reject(err);
            });
    })
}

// 更新欄位資料到活動表單
function UpdateSheetColumnData(postData) {
    var deferred = Q.defer();
    var options = {
        uri: 'https://mavis-activity.herokuapp.com/api/updateColumnData',
        headers: {
            'User-Agent': 'Request-Promise'
        },
        method: 'POST',
        body: postData,
        json: true
    };

    return requestPromise(options)
        .then(function (parsedBody) {
            deferred.resolve(parsedBody);
        })
        .catch(function (err) {
            console.error("更新狀態到活動模組表單失敗, 原因:" + err);
            deferred.reject(err);
        });
    return deferred.promise;
}

// 呼叫客戶留言回覆API
function ReplySettingRequest(postID, keyword, url) {
    return new Promise((resolve, reject) => {

        var options = {
            uri: url,
            method: 'POST',
            body: {
                "Keyword": keyword,
                "PostID": postID
            },
            json: true
        };
        return requestPromise(options)
            .then(function (parsedBody) {
                return resolve(parsedBody);
            })
            .catch(function (err) {
                errorLog._ErrorLogToDB("呼叫客戶留言回覆API失敗, 原因:" + err);
                return reject(err);
            });
    })
}

// 呼叫客戶留言回覆API
function ReplyComment(commentID, pageToken, replyBody) {
    return new Promise((resolve, reject) => {
        var options = {
            uri: 'https://graph.facebook.com/' + commentID + '/comments?access_token=' + pageToken,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            method: 'POST',
            body: replyBody,
            json: true
        };
        return requestPromise(options)
            .then(function (parsedBody) {
                return resolve("Succeed");
            })
            .catch(function (err) {
                errorLog._ErrorLogToDB("呼叫客戶留言回覆API失敗, 原因:" + err);
                return reject(err);
            });
    })
}

// 扣除廣播/私訊點數
function DeductBroadcastQuota(pageID) {
    return new Promise((resolve, reject) => {
        db._onValuePromise("EilisFB/" + pageID, "PageBasicData").then(function (_PageBasicData) {
            var AdminID = _PageBasicData["PageAdmin"]["UserID"];
            db._onValuePromise("EilisUser/" + AdminID + "/ProductInfo", "ProductFunction").then(function (_FunctionData) {
                if (_FunctionData != null) {
                    // 當月點數大於0, 扣除當月點數
                    if (_FunctionData.hasOwnProperty("EilisBroadcastLimit") && _FunctionData["EilisBroadcastLimit"] > 0) {
                        db._transactionCount("EilisUser/" + AdminID + "/ProductInfo/ProductFunction/EilisBroadcastLimit", -1, function () {
                            return resolve("已扣除廣播點數");
                        })
                    }
                    // 當月點數為0, 若加值點數大於0, 扣除加值點數
                    else if (_FunctionData.hasOwnProperty("EilisBonusLimit") && _FunctionData["EilisBonusLimit"] > 0) {
                        db._transactionCount("EilisUser/" + AdminID + "/ProductInfo/ProductFunction/EilisBonusLimit", -1, function () {
                            return resolve("已扣除廣播點數");
                        })
                    }
                    // 扣除當月點數(負值繼續往下扣)
                    else {
                        db._transactionCount("EilisUser/" + AdminID + "/ProductInfo/ProductFunction/EilisBroadcastLimit", -1, function () {
                            return resolve("已扣除廣播點數");
                        })
                    }
                }
                else {
                    return reject("扣除廣播/私訊點數失敗, 原因:找不到對應的管理者資訊");
                }
            }).catch(function (err) {
                return reject("扣除廣播/私訊點數失敗, 原因:" + err);
            })
        }).catch(function (err) {
            return reject("扣除廣播/私訊點數失敗, 原因:" + err);
        })
    })
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

// 全形轉半形
var _fullWidthToHalfWidth = function (_Input) {
    var HalfWidthOutput = _Input.replace(
        /[\uff01-\uff5e]/g,
        function (ch) {
            // 取代全形字元
            return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
        }
    ).replace(
        /[\u3000]/g,
        function (ch) {
            // 取代全形空白
            return String.fromCharCode(0x20);
        });
    return HalfWidthOutput;
}

module.exports = CommentReply;