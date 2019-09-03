var db = require("../../db/firebase_db.js");
var Q = require("q");
const FB = require('fb');
const TimeNow = require('../../tool/TimeNow');
var message = require("../set_payload/models/message_model.js");
var image = require("../set_payload/models/image_model.js");
var webCard = require("../set_payload/models/web_card_model.js");
var blueMenu = require("../set_payload/models/blue_menu_model.js");
var PageSetting = require("../page_setting/model.js");
var requestPromise = require('request-promise');
const Step = require('step');
const DBQuery = require("../../tool/DBQuery");
const EilisFunctionModel = require('../../fb_routes/model/eilis_function_model');
const commentReplyModel = require('../../fb_routes/model/comment_reply_model.js');

exports._TraceMailboxRights = function (req, res) {
    var Code = req.body.Code;
    var ResultArr = [];
    db._onValuePromiseWithoutChild("EilisUser").then(function (_UserData) {

        var UserIDArr = Object.getOwnPropertyNames(_UserData);
        UserIDArr.map(function (_UserID) {
            if (_UserData[_UserID]["UserBasicData"].hasOwnProperty("AllPageData") && _UserData[_UserID]["UserBasicData"]["AllPageData"].hasOwnProperty("data")) {
                var PageData = _UserData[_UserID]["UserBasicData"]["AllPageData"]["data"];
                if (PageData != null) {
                    Object.keys(PageData).forEach(function (key) {
                        var PageDataVal = PageData[key];
                        var PageToken = PageDataVal.access_token;
                        callPermissionAPI(_UserID, PageToken).then(function (_PagePermissionData) {
                            var PermissionData = _PagePermissionData["data"];
                            PermissionData.map(function (_Permission) {
                                if (_Permission.permission == "read_page_mailboxes" && _Permission.status == "granted") {
                                    var AdminName = _UserData[_UserID]["UserBasicData"]["UserName"];
                                    var PageName = PageDataVal.name;
                                    ResultArr.push(AdminName + ":" + PageName);
                                }
                                if (UserIDArr.indexOf(_UserID) == UserIDArr.length - 1 && PermissionData.indexOf(_Permission) == PermissionData.length - 1) {
                                    res.json({ "ResultArr": ResultArr });
                                }
                            })
                        }).catch(function (err) {
                            if (UserIDArr.indexOf(_UserID) == UserIDArr.length - 1 && PermissionData.indexOf(_Permission) == PermissionData.length - 1) {
                                res.json({ "ResultArr": + ResultArr });
                            }
                        });
                    });
                }
            }
        })
    })
}

// 搬移粉專私訊介面相關設定
exports._CopyPageSetting = function (req, res) {
    var SourcePageID = req.body.SourcePageID;
    var TargetPageID = req.body.TargetPageID;
    if (SourcePageID && TargetPageID) {
        try {
            //取得原粉專設定
            db._onValuePromise("EilisFB", SourcePageID).then(function (_SourcePageData) {
                db._onValuePromise("EilisFB", TargetPageID).then(function (_TargetPageData) {
                    var CopyPageData = Object.assign({}, _SourcePageData);
                    //使用粉專原本的PageBasicData
                    CopyPageData.PageBasicData = _TargetPageData.PageBasicData;
                    //使用粉專原本的CustomerService, OfficeSetting
                    if (CopyPageData.hasOwnProperty("CustomerService")) {
                        CopyPageData.CustomerService = (_TargetPageData.hasOwnProperty("CustomerService")) ? _TargetPageData.CustomerService : null;
                    }
                    if (CopyPageData.hasOwnProperty("OfficeSetting")) {
                        CopyPageData.OfficeSetting = (_TargetPageData.hasOwnProperty("OfficeSetting")) ? _TargetPageData.OfficeSetting : null;
                    }
                    //更換ServiceSettings內的Token
                    var TargetPageToken = _TargetPageData.PageBasicData.PageToken;
                    Object.keys(CopyPageData.ServiceSetting).forEach(function (_Key) {
                        CopyPageData.ServiceSetting[_Key]["qs"]["access_token"] = TargetPageToken;
                    })
                    db._update("EilisFB", TargetPageID, CopyPageData).then(function () {
                        res.json({ "Message": "成功搬移粉專設定!" });
                    })
                })
            })
        }
        catch (err) {
            res.json({ "Error": "搬移粉專設定出現錯誤, 原因:" + err });
        }
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

exports._TestCard = function (req, res) {
    var pageID = req.body.PageID;
    var messageText = req.body.MessageText;
    var senderID = req.body.SenderID;
    var pageToken = req.body.PageToken;
    DBQuery._EilisUserPage(pageID).then(function (pageContent) {
        EilisFunctionModel.SendPayload(messageText, pageContent, senderID, pageToken);
    })
}

exports._TestComment = function (req, res) {
    var PageID = req.body.PageID;
    var PostID = req.body.PostID;
    var CommentID = req.body.CommentID;
    var Message = req.body.Message;
    var UserID = req.body.UserID;
    var UserName = req.body.UserName;
    var CommentReply = new commentReplyModel(PageID, PostID, CommentID, Message, UserID, UserName);
    CommentReply.keywordsReply(CommentReply.PageID, CommentReply.PostID, CommentReply.CommentID, CommentReply.Message, CommentReply.UserID, CommentReply.UserName);
}

exports._TestAPICard = function (req, res) {
    var pageID = req.body.PageID;
    var messageText = req.body.MessageText;
    var senderID = req.body.SenderID;
    var pageToken = req.body.PageToken;
    DBQuery._EilisUserPage(pageID).then(function (pageContent) {
        EilisFunctionModel.SendAPICard(messageText, pageContent, senderID, pageToken);
    })
}

exports._TestCommentReply = function (req, res) {
    var PageID = req.body.PageID;
    var CommentID = req.body.CommentID;
    var Message = req.body.Message;
    var CommentReply = new commentReplyModel(PageID, null, CommentID, Message, null, null);
    CommentReply.APIkeywordsReply(CommentReply.PageID, CommentReply.CommentID, CommentReply.Message);
}

exports._TestAPI = function (req, res) {
    var Number = req.body.Number;
    Step(
        function () {
            if (Number > 1) {
                Number = 1;
                return Number;
            }
            else {
                Number = Number;
                throw new Error(Number);
            }


        },
        function (err, result) {
            if (!err) {
                return Number;
            }
            else {
                res.json({ "Test": Number })
                // throw new Error(Number);

            }
            console.log("!");
        },
        function (err, result) {
            console.log("!!");
            if (err) {
                Number = 2;
            }
            res.json({ "test": 1 });
        }
    );
}

exports._TestAddBonus = function (req, res) {
    var Group = req.body.Group;
    db._onValuePromise("EilisPSID/421955544535676/SenderData", "GeneralSender").then(function (_AllPSIDData) {
        var PSIDArr = Object.getOwnPropertyNames(_AllPSIDData);
        var TotalCount = PSIDArr.length;
        console.log(TotalCount);
        var MissionCompleteCount = 0;
        var NoGroup = 0;
        for (var _Index = 0; _Index < TotalCount; _Index++) {
            var _PSID = PSIDArr[_Index];
            var Tag = _AllPSIDData[_PSID]["Tag"];
            var HasGroup = false;
            _AllPSIDData[_PSID]["Tag"].map(function (_TagName, _IndexOfTag) {
                if (_TagName.indexOf("Group") != -1) {
                    HasGroup = true;
                }
                else if (_IndexOfTag == _AllPSIDData[_PSID]["Tag"].length - 1 && HasGroup == false) {
                    _AllPSIDData[_PSID]["Tag"].push("Group20**");
                    NoGroup += 1;
                    var UpdateTag = {
                        "Tag": _AllPSIDData[_PSID]["Tag"]
                    }
                    SetGroup(_PSID, Group, UpdateTag).then(function () {
                        MissionCompleteCount += 1;
                        if (MissionCompleteCount == NoGroup) {
                            var UpdateCount = {};
                            UpdateCount["Group" + Group + "**"] = MissionCompleteCount;
                            db._update("EilisPSID/421955544535676", "UserCount", UpdateCount).then(function () {
                                console.log(MissionCompleteCount);
                                res.json({ "Message": "Finished" });
                            })
                        }
                    })
                }
            })
            // if (_AllPSIDData[_PSID]["Tag"].indexOf("Group20**") == -1) {
            //     // HasGroup += 1;
            //     // console.log(_PSID);
            //     // console.log(HasGroup);
            //     continue;
            // }
            // else {
            // _AllPSIDData[_PSID]["Tag"].splice(_AllPSIDData[_PSID]["Tag"].indexOf("Group20**"), 1);

            // if ((_Index + 1) % 10000 == 0) {
            //     console.log("Group" + Group + "** Done Setting.");
            // }
            if (_Index != TotalCount - 1) {
                continue;
            }
        }
        // }
    })
}

function SetGroup(PSID, Group, UpdateTag) {
    var deferred = Q.defer();
    db._update("EilisPSID/421955544535676/SenderData/GeneralSender", PSID, UpdateTag).then(function () {
        // db._transactionCount("EilisPSID/421955544535676/UserCount/Group" + Group + "**", 1, function(_Count){
        deferred.resolve("OK");
        // })
    }).catch(function (err) {
        deferred.reject(err);
    })
    return deferred.promise;
}

exports._TestReplyCardAPI = function (req, res) {
    var Keyword = req.body.Keyword;
    if (Keyword) {
        res.json({
            "Type": "MessageCard",
            "Content": {
                "Message": Keyword,
                "ButtonData": [{
                    "Type": "Url",
                    "Title": "產品詳細介紹",
                    "Url": "http://www.eilis-ai.com"
                }, {
                    "Type": "Payload",
                    "Title": "限時折扣"
                }]
            }
        })
    }
}

exports._TestReplyCommentAPI = function (req, res) {
    var Keyword = req.body.Keyword;
    if (Keyword) {
        res.json({
            "Type": "Image",
            "Link": "https://pic.pimg.tw/wordgod/1488708001-2618985987.jpg?v=1488708003"
        })
    }
}

// 取得用戶表單連結
exports._GetPagePSIDLink = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        db._onValuePromise("EilisPSID/" + PageID, "SheetData").then(function (_SheetData) {
            if (_SheetData != null) {
                res.json({ "Link": _SheetData.Link });
            } else {
                res.json({ "Error": "找不到對應的粉專表單" });
            }
        }).catch(function (err) {
            res.json({ "Error": "取得用戶表單連結出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數" });
    }
}

function callPermissionAPI(userID, pageToken) {
    var options = {
        uri: 'https://graph.facebook.com/v2.6/' + userID + '/permissions',
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