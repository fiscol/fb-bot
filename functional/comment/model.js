var db = require('../../db/firebase_db.js');
var errorLog = require('../../tool/ErrorLog.js');
var requestPromise = require('request-promise');

var Comment = function (pageID, postID) {
    this.pageID = pageID;
    this.postID = postID;
}

// 設定關鍵字回覆
Comment.prototype.setKeywordsPrivateReply = function (pageID, postID, keyWord, replyMessage, activityName, followComment, status, freeMessage) {
    var Ref = "EilisFB";
    var ChildName = pageID;
    return db._onValuePromise(Ref, ChildName).then(function (_PageData) {
        var PageName = _PageData["PageBasicData"]["PageName"];
        var PageToken = _PageData["PageBasicData"]["PageToken"];
        var PageAdmin = _PageData["PageBasicData"]["PageAdmin"]["UserID"];
        // 檢查每月的私訊(廣播點數)Quota是否為負，若為負則不能讓用戶設定新的文章
        return checkBroadcastQuota(PageAdmin).then(function () {
            // return checkPostID(pageID, PageToken, postID).then(function (_StoryResult) {
            var _KeywordsData;

            return db._onValuePromiseWithoutChild("EilisKeywords").then(function (_PageSetting) {
                // 沒有設定過關鍵字功能
                if (!_PageSetting.hasOwnProperty(pageID)) {
                    _KeywordsData = [{
                        KeyWord: keyWord,
                        ReplyMessage: replyMessage,
                        FollowComment: followComment
                    }]
                }
                else {
                    // 第一次設定的PostID
                    if (!_PageSetting[pageID].hasOwnProperty(postID)) {
                        _KeywordsData = [{
                            KeyWord: keyWord,
                            ReplyMessage: replyMessage,
                            FollowComment: followComment
                        }]
                    }
                    // 此組PostID已存在設定
                    else {
                        var hasSameKeyword = false;
                        _KeywordsData = (_PageSetting[pageID][postID].hasOwnProperty("Settings")) ? _PageSetting[pageID][postID]["Settings"] : [];
                        for (var i = 0; i < _KeywordsData.length; i++) {
                            // 找到已設定的同一組關鍵字, 覆寫原設定(更新留言回覆與私訊訊息)
                            if (_KeywordsData[i].KeyWord == keyWord) {
                                hasSameKeyword = true;
                                _KeywordsData[i].ReplyMessage = replyMessage;
                                _KeywordsData[i].FollowComment = followComment;
                            }
                        }
                        // 關鍵字是新的, 新增一組設定
                        if (hasSameKeyword == false) {
                            _KeywordsData.push({
                                KeyWord: keyWord,
                                ReplyMessage: replyMessage,
                                FollowComment: followComment
                            })
                        }
                    }
                }
                Ref = "EilisKeywords/" + pageID + "/" + postID;
                ChildName = "Settings";
                return db._update(Ref, ChildName, _KeywordsData).then(function (_Result) {
                    // 創建活動表單
                    if (activityName != "NoActivitySheet") {
                        var PostData = {
                            "PageID": pageID,
                            "PostID": postID,
                            "Keyword": keyWord,
                            "ReplyMessage": replyMessage,
                            "FollowComment": followComment,
                            "PageName": PageName,
                            "ActivityName": activityName
                        }
                        if (_PageSetting.hasOwnProperty(pageID) && _PageSetting[pageID].hasOwnProperty(postID) && _PageSetting[pageID][postID].hasOwnProperty("SheetID")) {
                            PostData.SheetID = _PageSetting[pageID][postID]["SheetID"];
                            PostData.SheetLink = _PageSetting[pageID][postID]["Link"];
                        }

                        return createCommentSheet(PostData).then(function (_CreateResult) {
                            // 關鍵字觸發狀態設定(Status)
                            _CreateResult.Status = status.toLowerCase();
                            // 扣除私訊點數設定
                            _CreateResult.FreeMessage = freeMessage.toLowerCase();
                            _CreateResult.Message = "加入關鍵字設定成功";
                            Ref = "EilisKeywords/" + pageID;
                            ChildName = postID;
                            return db._update(Ref, ChildName, _CreateResult).then(function () {
                                return Promise.resolve(_CreateResult);
                            })
                        })
                    }
                    // 不創建活動表單
                    else {
                        var _CreateResult = {
                            "Message": "加入關鍵字設定成功",
                            "Link": null,
                            "SheetID": null
                        };
                        if (_PageSetting.hasOwnProperty(pageID) && _PageSetting[pageID].hasOwnProperty(postID) && _PageSetting[pageID][postID].hasOwnProperty("SheetID")) {
                            _CreateResult.SheetID = _PageSetting[pageID][postID]["SheetID"];
                            _CreateResult.Link = _PageSetting[pageID][postID]["Link"];
                        }
                        Ref = "EilisKeywords/" + pageID;
                        ChildName = postID;
                        return db._update(Ref, ChildName, _CreateResult).then(function () {
                            return Promise.resolve(_CreateResult);
                        })
                    }
                }).catch(function (err) {
                    return Promise.reject(err);
                });
            }).catch(function (err) {
                return Promise.reject(err);
            })
            // }).catch(function (err) {
            //     return Promise.reject(err);
            // })
        }).catch(function (err) {
            return Promise.reject(err);
        })
    }).catch(function (err) {
        return Promise.reject(err);
    });
}

// 初始化設定單一文章所有關鍵字設定
Comment.prototype.createKeywordsSetting = function (pageID, postID, settingData, activityName, status, freeMessage) {
    var Ref = "EilisFB";
    var ChildName = pageID;
    return db._onValuePromise(Ref, ChildName).then(function (_PageData) {
        var PageName = _PageData["PageBasicData"]["PageName"];
        var PageToken = _PageData["PageBasicData"]["PageToken"];
        var PageAdmin = _PageData["PageBasicData"]["PageAdmin"]["UserID"];
        // 檢查每月的私訊(廣播點數)Quota是否為負，若為負則不能讓用戶設定新的文章
        return checkBroadcastQuota(PageAdmin).then(function () {
            return checkPostID(pageID, PageToken, postID).then(function (_StoryResult) {
                settingData.map(function (_Data, _Index) {
                    if (!_Data.hasOwnProperty("FollowComment") || _Data.FollowComment == "" || _Data.FollowComment == null) {
                        settingData[_Index]["FollowComment"] = "NoFollowComment";
                    }
                    if (!_Data.hasOwnProperty("ReplyMessage") || _Data.ReplyMessage == "" || _Data.ReplyMessage == null) {
                        settingData[_Index]["ReplyMessage"] = "NoReplyMessage";
                    }
                    if (!_Data.hasOwnProperty("KeyWord") || _Data.KeyWord == "" || _Data.KeyWord == null) {
                        settingData[_Index]["KeyWord"] = "AllKeywordShallPass";
                    }
                })

                Ref = "EilisKeywords/" + pageID + "/" + postID;
                ChildName = "Settings";
                return db._set(Ref, ChildName, settingData).then(function (_Result) {
                    // 創建活動表單
                    if (activityName != "NoActivitySheet") {
                        var PostData = {
                            "PageID": pageID,
                            "PostID": postID,
                            "SettingData": settingData,
                            "PageName": PageName,
                            "ActivityName": activityName
                        }
                        Ref = "EilisKeywords";
                        return db._onValuePromiseWithoutChild(Ref).then(function (_PageSetting) {
                            if (_PageSetting.hasOwnProperty(pageID) && _PageSetting[pageID].hasOwnProperty(postID) && _PageSetting[pageID][postID].hasOwnProperty("SheetID")) {
                                PostData.SheetID = _PageSetting[pageID][postID]["SheetID"];
                                PostData.SheetLink = _PageSetting[pageID][postID]["Link"];
                            }

                            return createCommentSheet(PostData).then(function (_CreateResult) {
                                // 關鍵字觸發狀態設定(Status)
                                _CreateResult.Status = status.toLowerCase();
                                // 扣除私訊點數設定
                                _CreateResult.FreeMessage = freeMessage.toLowerCase();
                                _CreateResult.Message = "加入關鍵字設定成功";
                                Ref = "EilisKeywords/" + pageID;
                                ChildName = postID;
                                return db._update(Ref, ChildName, _CreateResult).then(function () {
                                    return Promise.resolve(_CreateResult);
                                })
                            })
                        }).catch(function (err) {
                            return Promise.reject(err);
                        })

                    }
                    // 不創建活動表單
                    else {
                        var _CreateResult = {
                            "Message": "加入關鍵字設定成功",
                            "Link": null,
                            "SheetID": null,
                            "Status": status.toLowerCase()
                        };
                        Ref = "EilisKeywords/" + pageID;
                        ChildName = postID;
                        return db._update(Ref, ChildName, _CreateResult).then(function () {
                            return Promise.resolve(_CreateResult);
                        })
                    }
                }).catch(function (err) {
                    return Promise.reject(err);
                });
            }).catch(function (err) {
                return Promise.reject(err);
            })
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }).catch(function (err) {
        return Promise.reject(err);
    });
}

// 取得單一文章所有關鍵字設定
Comment.prototype.getKeywordsSetting = function (pageID, postID) {
    if (postID != "All") {
        var Ref = "EilisKeywords/" + pageID;
        var ChildName = postID;
        return db._onValuePromise(Ref, ChildName).then(function (_SettingData) {
            if (_SettingData != null) {
                _SettingData["Settings"].map(function (_Data, _Index) {
                    if (_Data.FollowComment == "NoFollowComment") {
                        _SettingData["Settings"][_Index]["FollowComment"] = "";
                    }
                    if (_Data.ReplyMessage == "NoReplyMessage") {
                        _SettingData["Settings"][_Index]["ReplyMessage"] = "";
                    }
                    if (_Data.KeyWord == "AllKeywordShallPass") {
                        _SettingData["Settings"][_Index]["KeyWord"] = "";
                    }
                })
                return Promise.resolve({ "SettingData": _SettingData["Settings"], "Status": _SettingData["Status"], "FreeMessage": _SettingData["FreeMessage"] || "off" });
            }
            else {
                return Promise.reject("找不到對應的關鍵字設定");
            }
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }
    else {
        var Ref = "EilisKeywords";
        var ChildName = pageID;
        return db._onValuePromise(Ref, ChildName).then(function (_PostIDData) {
            if (_PostIDData != null) {
                Object.keys(_PostIDData).forEach(function (_POSTID, _PostIDIndex) {
                    if (_POSTID.split('_').length == 2 && _POSTID.split('_')[1] != "") {
                        // 扣除廣播/私訊點數設定，設定為off時會扣除點數，舊文章預設為on（不扣除）
                        if(!_PostIDData[_POSTID].hasOwnProperty("FreeMessage")){
                            _PostIDData[_POSTID]["FreeMessage"] = "on";
                        }
                        var SettingData = _PostIDData[_POSTID]["Settings"];
                        SettingData.map(function (_Data, _SettingIndex) {
                            if (_Data.FollowComment == "NoFollowComment") {
                                _PostIDData[_POSTID]["Settings"][_SettingIndex]["FollowComment"] = "";
                            }
                            if (_Data.ReplyMessage == "NoReplyMessage") {
                                _PostIDData[_POSTID]["Settings"][_SettingIndex]["ReplyMessage"] = "";
                            }
                            if (_Data.KeyWord == "AllKeywordShallPass") {
                                _PostIDData[_POSTID]["Settings"][_SettingIndex]["KeyWord"] = "";
                            }
                        })
                        if (_PostIDData[_POSTID].hasOwnProperty("Link")) {
                            delete _PostIDData[_POSTID]["Link"]
                        };
                        if (_PostIDData[_POSTID].hasOwnProperty("Message")) {
                            delete _PostIDData[_POSTID]["Message"]
                        };
                        if (_PostIDData[_POSTID].hasOwnProperty("SheetID")) {
                            delete _PostIDData[_POSTID]["SheetID"]
                        };
                    }
                    else {
                        delete _PostIDData[_POSTID];
                    }
                })
                return Promise.resolve(_PostIDData);
            }
            else {
                return Promise.reject("找不到對應的關鍵字設定");
            }
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }
}

// 更新單一文章所有關鍵字設定
Comment.prototype.updateKeywordsSetting = function (pageID, postID, settingData) {
    var Ref = "EilisKeywords/" + pageID + "/" + postID;
    var ChildName = "Settings";
    settingData.map(function (_Data, _Index) {
        if (!_Data.hasOwnProperty("FollowComment") || _Data.FollowComment == "" || _Data.FollowComment == null) {
            settingData[_Index]["FollowComment"] = "NoFollowComment";
        }
        if (!_Data.hasOwnProperty("ReplyMessage") || _Data.ReplyMessage == "" || _Data.ReplyMessage == null) {
            settingData[_Index]["ReplyMessage"] = "NoReplyMessage";
        }
        if (!_Data.hasOwnProperty("KeyWord") || _Data.KeyWord == "" || _Data.KeyWord == null) {
            settingData[_Index]["KeyWord"] = "AllKeywordShallPass";
        }
    })
    return db._set(Ref, ChildName, settingData).then(function (_Result) {
        return Promise.resolve({ "Message": "已更新文章關鍵字設定" });
    }).catch(function (err) {
        return Promise.reject(err);
    });
}

// 開關留言模組
Comment.prototype.setKeywordsStatus = function (pageID, postID, status) {
    var Ref = "EilisKeywords/" + pageID;
    var ChildName = postID;
    return db._onValuePromise(Ref, ChildName).then(function (_PostData) {
        if (_PostData != null) {
            _PostData.Status = status.toLowerCase();
            return db._update(Ref, ChildName, _PostData).then(function () {
                return Promise.resolve({ "Message": "已調整留言模組開關" });
            }).catch(function (err) {
                return Promise.reject(err);
            });
        }
        else {
            return Promise.reject("沒有找到對應的關鍵字設定");
        }
    }).catch(function (err) {
        return Promise.reject(err);
    });
}

// 開關私訊扣點數功能
Comment.prototype.setFreeMessageStatus = function (pageID, postID, freeMessage) {
    var Ref = "EilisKeywords/" + pageID;
    var ChildName = postID;
    return db._onValuePromise(Ref, ChildName).then(function (_PostData) {
        if (_PostData != null) {
            _PostData.FreeMessage = freeMessage.toLowerCase();
            return db._update(Ref, ChildName, _PostData).then(function () {
                return Promise.resolve({ "Message": "已調整私訊扣點數開關" });
            }).catch(function (err) {
                return Promise.reject(err);
            });
        }
        else {
            return Promise.reject("沒有找到對應的關鍵字設定");
        }
    }).catch(function (err) {
        return Promise.reject(err);
    });
}

// 取得可設定的前50篇文章
Comment.prototype.getPosts = function (pageID) {
    return new Promise((resolve, reject) => {
        var Ref = "EilisFB";
        var ChildName = pageID;
        db._onValuePromise(Ref, ChildName).then(function (_PageData) {
            var PageToken = _PageData["PageBasicData"]["PageToken"];
            var options = {
                uri: 'https://graph.facebook.com/' + pageID + '/promotable_posts?access_token=' + PageToken + '&fields=link,message&limit=50',
                headers: {
                    'User-Agent': 'Request-Promise'
                },
                method: 'GET'
            };

            requestPromise(options)
                .then(function (parsedBody) {
                    resolve(JSON.parse(parsedBody));
                })
                .catch(function (err) {
                    errorLog._ErrorLogToDB(err);
                    reject("查詢頁面文章出現錯誤");
                });
        }).catch(function (err) {
            errorLog._ErrorLogToDB(err);
            reject("查詢頁面文章出現錯誤");
        });
    })
}

// API對接留言回覆設定
Comment.prototype.apiCommentReply = function (pageID, keywords, url, postID, status) {
    return new Promise((resolve, reject) => {
        // 預設最多加入5組關鍵字設定
        if (keywords.length != 0 && keywords.length > 5) {
            keywords = keywords.slice(0, 5);
        }
        var ReplySetting = {
            "Keywords": keywords,
            "Status": status,
            "Url": url
        }
        db._update("EilisFB/" + pageID + "/EilisAPIComment", postID, ReplySetting).then(function () {
            resolve({ "Message": "加入API對接留言回覆設定成功" });
        }).catch(function (err) {
            reject(err);
        })
    })
}

// 取得API對接留言回覆設定
Comment.prototype.getAPICommentSetting = function (pageID) {
    return new Promise((resolve, reject) => {
        db._onValuePromise("EilisFB/" + pageID, "EilisAPIComment").then(function (_APISetting) {
            if (_APISetting != null) {
                var APISettingArr = [];
                Object.keys(_APISetting).forEach(function (_Key, _Index) {
                    var SettingData = _APISetting[_Key];
                    SettingData["PostID"] = _Key;
                    SettingData["PageID"] = pageID;
                    APISettingArr.push(SettingData);
                    if (_Index == Object.keys(_APISetting).length - 1) {
                        resolve({ "Settings": APISettingArr });
                    }
                })
            }
            else {
                reject("沒有找到對應的API對接私訊卡片設定!");
            }
        }).catch(function (err) {
            reject(err);
        })
    })
}

function createCommentSheet(postData) {
    var options = {
        uri: 'https://mavis-activity.herokuapp.com/api/createCommentSheet',
        headers: {
            'User-Agent': 'Request-Promise'
        },
        method: 'POST',
        body: postData,
        json: true
    };

    return requestPromise(options)
        .then(function (parsedBody) {
            return Promise.resolve(parsedBody);
        })
        .catch(function (err) {
            errorLog._ErrorLogToDB(err);
        });
}

function checkPostID(pageID, pageToken, postID) {
    return new Promise((resolve, reject) => {
        var options = {
            uri: 'https://graph.facebook.com/' + pageID + '/promotable_posts?access_token=' + pageToken + '&fields=link,message&limit=100',
            headers: {
                'User-Agent': 'Request-Promise'
            },
            method: 'GET'
        };

        requestPromise(options)
            .then(function (parsedBody) {
                if (JSON.parse(parsedBody).hasOwnProperty("data")) {
                    JSON.parse(parsedBody)["data"].map(function (storyData) {
                        if (storyData.hasOwnProperty("id") && storyData["id"] == postID) {
                            resolve("找到對應文章ID");
                        }
                        else if (JSON.parse(parsedBody)["data"].map(function (e) { return e.id; }).indexOf(storyData["id"]) == JSON.parse(parsedBody)["data"].length - 1) {
                            reject("找不到對應PO文代碼，設定失敗");
                        }
                    })
                }
                else {
                    reject("找不到對應PO文代碼，設定失敗");
                }
            })
            .catch(function (err) {
                errorLog._ErrorLogToDB(err);
                reject("查詢頁面文章出現錯誤，設定失敗");
            });
    })
}

function checkBroadcastQuota(adminID) {
    return new Promise((resolve, reject) => {
        db._onValuePromise("EilisUser/" + adminID + "/ProductInfo", "ProductFunction").then(function (_FunctionData) {
            if (_FunctionData != null) {
                var BroadcastQuotaIsEnough = false;

                if (_FunctionData.hasOwnProperty("EilisBroadcastLimit") && _FunctionData["EilisBroadcastLimit"] >= 0) {
                    BroadcastQuotaIsEnough = true;
                }
                else if (_FunctionData.hasOwnProperty("EilisBonusLimit") && _FunctionData["EilisBonusLimit"] >= 0) {
                    BroadcastQuotaIsEnough = true;
                }
                if (BroadcastQuotaIsEnough == true) {
                    return resolve("ok");
                }
                else {
                    return reject("廣播當月剩餘數量不足, 無法設定新的留言模組文章");
                }
            }
            else {
                return reject("取得廣播當月剩餘數量失敗, 原因:找不到對應的管理者資訊");
            }
        }).catch(function (err) {
            return reject("取得廣播當月剩餘數量失敗, 原因:" + err);
        })
    })
}

module.exports = Comment;