var db = require('../../db/firebase_db.js');
var requestPromise = require('request-promise');
var Q = require('q');

var Tag = function (pageID, psid, userName, tag, tagArray) {
    this.pageID = pageID;
    this.psid = psid;
    this.userName = userName;
    this.tag = tag;
    this.tagArray = tagArray;
}

// 新增標籤
Tag.prototype.createTag = function (pageID, psid, tag) {
    // 設定Tag
    return db._onValuePromise("EilisPSID/" + pageID + "/SenderData/GeneralSender/" + psid, "Tag").then(function (_TagData) {
        if (_TagData.indexOf(tag) == -1) {
            _TagData.push(tag);
            return db._set("EilisPSID/" + pageID + "/SenderData/GeneralSender/" + psid, "Tag", _TagData).then(function () {
                return db._onValuePromise("EilisPSID/" + pageID, "Tag").then(function (_PageTagData) {
                    if (_PageTagData == null) {
                        var PageTagData = { "Tag": ["GeneralSender", tag] };
                        return db._update("EilisPSID", pageID, "Tag", PageTagData).then(function () {
                            return Promise.resolve({ "Message": "已成功加入Tag" + tag });
                        });
                    }
                    else if (_PageTagData.indexOf(tag) == -1) {
                        _PageTagData.push(tag);
                        return db._set("EilisPSID/" + pageID, "Tag", _PageTagData).then(function () {
                            return Promise.resolve({ "Message": "已成功加入Tag" + tag });
                        });
                    }
                    else {
                        return Promise.resolve({ "Message": "已成功加入Tag" + tag });
                    }
                }).catch(function (err) {
                    return Promise.reject(err);
                })
            });
        }
        else {
            return Promise.reject("用戶已經有相同的Tag了喔!");
        }
    })
}

// 移除標籤
Tag.prototype.removeTag = function (pageID, psid, tag) {
    return db._onValuePromise("EilisPSID", pageID).then(function (_PageData) {
        var _TagData = _PageData["SenderData"]["GeneralSender"][psid]["Tag"];
        if (_TagData.indexOf(tag) != -1) {
            _TagData.splice(_TagData.indexOf(tag), 1);
            return db._set("EilisPSID/" + pageID + "/SenderData/GeneralSender/" + psid, "Tag", _TagData).then(function () {
                var PSIDArr = Object.getOwnPropertyNames(_PageData["SenderData"]["GeneralSender"]);
                var PSIDLength = PSIDArr.length;
                var MissionCount = 0;
                var OtherPSIDStillHasTag = false;
                PSIDArr.forEach(function (PSID) {
                    var PSIDTagData = _PageData["SenderData"]["GeneralSender"][PSID]["Tag"];
                    if (PSIDTagData.indexOf(tag) != -1) {
                        OtherPSIDStillHasTag = true;
                    }
                    MissionCount += 1;
                })
                var PageTagData = _PageData["Tag"];
                if (MissionCount == PSIDLength) {
                    if (PageTagData.indexOf(tag) != -1 && OtherPSIDStillHasTag == false) {
                        PageTagData.splice(PageTagData.indexOf(tag), 1);
                        return db._set("EilisPSID/" + pageID, "Tag", PageTagData).then(function () {
                            return Promise.resolve({ "Message": "已成功移除Tag" + tag });
                        })
                    }
                    else {
                        return Promise.resolve({ "Message": "已成功移除Tag" + tag });
                    }
                }
            });
        }
        else {
            return Promise.reject("用戶並沒有使用這組Tag喔!");
        }
    })
}

// 讀取標籤
Tag.prototype.readTag = function (pageID, psid) {
    if (psid != null) {
        return db._onValuePromise("EilisPSID/" + pageID + "/SenderData/GeneralSender/" + psid, "Tag").then(function (_TagData) {
            return Promise.resolve({ "Tag": _TagData });
        })
    }
    else {
        return db._onValuePromise("EilisPSID/" + pageID, "Tag").then(function (_TagData) {
            return Promise.resolve({ "Tag": _TagData });
        })
    }
}

// 加入黑名單標籤
Tag.prototype.addBlackListTag = function (pageID, userName, tag) {
    return new Promise((resolve, reject) => {
        var AmountOfSameUserName = 0;
        var AlreadyHadTaggedUser = 0;
        db._onValuePromise("EilisPSID", pageID).then(function (_PageData) {
            var SenderData = _PageData["SenderData"]["GeneralSender"];
            var SenderIDArray = Object.getOwnPropertyNames(SenderData);
            var PromiseArr = [];
            for (var i = 0; i < SenderIDArray.length; i++) {
                var SenderID = SenderIDArray[i];
                if (SenderData[SenderID]["last_name"] + SenderData[SenderID]["first_name"] == userName.replace(" ", "") || SenderData[SenderID]["first_name"] + SenderData[SenderID]["last_name"] == userName.replace(" ", "")) {
                    var TagData = SenderData[SenderID]["Tag"];
                    if (TagData.indexOf(tag) == -1) {
                        PromiseArr.push(SetBlackListTag(pageID, SenderID, TagData, tag));
                        AmountOfSameUserName += 1;
                        console.log(AmountOfSameUserName);
                    }
                    else {
                        AlreadyHadTaggedUser += 1;
                    }
                }
                if (i == SenderIDArray.length - 1) {
                    if (AmountOfSameUserName != 0) {
                        var Step1 = Q.all(PromiseArr);
                        Step1.then(function () {
                            if (_PageData["Tag"].indexOf(tag) == -1) {
                                _PageData["Tag"].push(tag);
                            }
                            db._set("EilisPSID/" + pageID, "Tag", _PageData["Tag"]).then(function () {
                                resolve({ "Message": "已成功加入黑名單" });
                            });
                        }).catch(function (err) {
                            console.error(err);
                            reject(err);
                        })
                    }
                    else if (AlreadyHadTaggedUser != 0) {
                        console.error("用戶已被加入黑名單Tag");
                        reject("用戶已被加入黑名單Tag");
                    }
                    else {
                        console.error("沒有找到符合的用戶");
                        reject("沒有找到符合的用戶");
                    }
                }
                else {
                    continue;
                }
            }
        })
    })
}

Tag.prototype.addTagUserCount = function (PageID, TagArray) {
    return new Promise((resolve, reject) => {
        var CompleteCounter = 0;
        db._onValuePromise("EilisPSID/" + PageID, "UserCount").then(function (_UserCountData) {
            if (_UserCountData == null) {
                for (var i = 0; i < TagArray.length; i++) {
                    var Tag = TagArray[i];
                    var TagData = {};
                    TagData[Tag] = 1;
                    db._update("EilisPSID/" + PageID, "UserCount", TagData).then(function () {
                        CompleteCounter += 1;
                        if (CompleteCounter == TagArray.length) {
                            resolve({ "Message": "Succeed" });
                        }
                    })
                }
            }
            else {
                for (var i = 0; i < TagArray.length; i++) {
                    var Tag = TagArray[i];
                    if (_UserCountData.hasOwnProperty(Tag)) {
                        db._transactionCount("EilisPSID/" + PageID + "/UserCount/" + Tag, 1, function () {
                            CompleteCounter += 1;
                            if (CompleteCounter == TagArray.length) {
                                resolve({ "Message": "Succeed" });
                            }
                        })
                    }
                    else {
                        var TagData = {};
                        TagData[Tag] = 1;
                        db._update("EilisPSID/" + PageID, "UserCount", TagData).then(function () {
                            CompleteCounter += 1;
                            if (CompleteCounter == TagArray.length) {
                                resolve({ "Message": "Succeed" });
                            }
                        })
                    }
                }
            }
        })
    })
}

function SetBlackListTag(pageID, senderID, tagData, tag) {
    var deferred = Q.defer();
    tagData.push(tag);
    db._set("EilisPSID/" + pageID + "/SenderData/GeneralSender/" + senderID, "Tag", tagData).then(function () {
        deferred.resolve("更新Tag成功");
    }).catch(function (err) {
        deferred.reject(err);
    })
    return deferred.promise;
}

module.exports = Tag;