var Comment = require('./model.js');

// 設定留言關鍵字回覆
exports._SetKeywordsPrivateReply = function (req, res) {
    var PageID = req.body.PageID;
    var PostID = req.body.PostID;
    var Keyword = (req.body.Keyword == null) ? "AllKeywordShallPass" : req.body.Keyword;
    var ReplyMessage = req.body.ReplyMessage || "NoReplyMessage";
    var ActivityName = req.body.ActivityName || "NoActivitySheet";
    var FollowComment = req.body.FollowComment || "NoFollowComment";
    var Status = req.body.Status || "on"; //on為啟用留言模組
    var FreeMessage = req.body.FreeMessage || "on"; //on為不扣除點數, off為扣除點數

    if (PageID && PostID && Keyword) {
        var comment = new Comment(PageID, PostID);
        comment.setKeywordsPrivateReply(comment.pageID, comment.postID, Keyword, ReplyMessage, ActivityName, FollowComment, Status, FreeMessage).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "設定關鍵字回覆出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 初始化設定單一文章所有關鍵字設定
exports._CreateKeywordsSetting = function (req, res) {
    var PageID = req.body.PageID;
    var PostID = req.body.PostID;
    var SettingData = req.body.SettingData;
    var ActivityName = req.body.ActivityName || "NoActivitySheet";
    var Status = req.body.Status || "on"; //on為啟用留言模組
    var FreeMessage = req.body.FreeMessage || "on"; //on為不扣除點數, off為扣除點數

    if (PageID && PostID && SettingData) {
        var comment = new Comment(PageID, PostID);
        comment.createKeywordsSetting(comment.pageID, comment.postID, SettingData, ActivityName, Status, FreeMessage).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "文章關鍵字設定出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 取得粉專所有關鍵字設定
exports._GetKeywordsSetting = function (req, res) {
    var PageID = req.body.PageID;
    var PostID = req.body.PostID || "All";

    if (PageID && PostID) {
        var comment = new Comment(PageID, PostID);
        comment.getKeywordsSetting(comment.pageID, comment.postID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "取得粉專所有關鍵字設定出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 更新單一文章所有關鍵字設定
exports._UpdateKeywordsSetting = function (req, res) {
    var PageID = req.body.PageID;
    var PostID = req.body.PostID;
    var SettingData = req.body.SettingData;

    if (PageID && PostID && SettingData) {
        var comment = new Comment(PageID, PostID);
        comment.updateKeywordsSetting(comment.pageID, comment.postID, SettingData).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "更新單一文章所有關鍵字設定出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 開關留言模組
exports._SetKeywordsStatus = function (req, res) {
    var PageID = req.body.PageID;
    var PostID = req.body.PostID;
    var Status = req.body.Status;

    if (PageID && PostID && Status) {
        var comment = new Comment(PageID, PostID);
        comment.setKeywordsStatus(comment.pageID, comment.postID, Status).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "設定開關留言模組出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 開關私訊扣點數功能
exports._SetFreeMessageStatus = function (req, res) {
    var PageID = req.body.PageID;
    var PostID = req.body.PostID;
    var FreeMessage = req.body.FreeMessage; //on為不扣除點數, off為扣除點數

    if (PageID && PostID && FreeMessage) {
        var comment = new Comment(PageID, PostID);
        comment.setFreeMessageStatus(comment.pageID, comment.postID, FreeMessage).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "設定開關私訊扣點數出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 取得粉專文章
exports._GetPosts = function (req, res) {
    var PageID = req.body.PageID;

    if (PageID) {
        var comment = new Comment(PageID, null);
        comment.getPosts(comment.pageID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "取得粉專文章出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// API對接留言回覆設定
exports._APICommentReply = function (req, res) {
    var PageID = req.body.PageID;
    var Keywords = req.body.Keywords;
    var Url = req.body.Url;
    var PostID = req.body.PostID;
    var Status = req.body.Status;

    if (PageID && Keywords && Url && PostID && Status) {
        var comment = new Comment(PageID, PostID);
        comment.apiCommentReply(comment.pageID, Keywords, Url, comment.postID, Status).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "API對接留言回覆設定出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 取得API對接留言回覆設定
exports._GetAPICommentSetting = function (req, res) {
    var PageID = req.body.PageID;

    if (PageID) {
        var comment = new Comment(PageID, null);
        comment.getAPICommentSetting(comment.pageID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "取得API對接留言回覆設定出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}