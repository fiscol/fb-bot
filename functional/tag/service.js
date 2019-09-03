var TagModel = require('./model.js');

// 新增標籤
exports._CreateTag = function (req, res) {
    var PageID = req.body.PageID;
    var PSID = req.body.PSID;
    var Tag = req.body.Tag;
    if (PageID && Tag) {
        var tag = new TagModel(PageID, PSID, null, Tag, [Tag]);
        tag.createTag(tag.pageID, tag.psid, tag.tag).then(function (_Result) {
            tag.addTagUserCount(tag.pageID, tag.tagArray).then(function () {
                res.json(_Result);
            }).catch(function (err) {
                res.json({ "Error": "新增標籤出現錯誤, 原因:" + err });
            })
        }).catch(function (err) {
            res.json({ "Error": "新增標籤出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 移除標籤
exports._RemoveTag = function (req, res) {
    var PageID = req.body.PageID;
    var PSID = req.body.PSID;
    var Tag = req.body.Tag;
    if (PageID && Tag) {
        var tag = new TagModel(PageID, PSID, null, Tag, null);
        tag.removeTag(tag.pageID, tag.psid, tag.tag).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "移除標籤出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 讀取標籤
exports._ReadTag = function (req, res) {
    var PageID = req.body.PageID;
    var PSID = req.body.PSID;
    if (PageID) {
        var tag = new TagModel(PageID, PSID, null, null, null);
        tag.readTag(tag.pageID, tag.psid).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "讀取標籤出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 加入黑名單標籤
exports._AddBlackListTag = function (req, res) {
    var PageID = req.body.PageID;
    var UserName = req.body.UserName;
    if (PageID && UserName) {
        var Tag = "BlackList";
        var tag = new TagModel(PageID, null, UserName, Tag, [Tag]);
        tag.addBlackListTag(tag.pageID, tag.userName, tag.tag).then(function (_Result) {
            tag.addTagUserCount(tag.pageID, tag.tagArray).then(function () {
                res.json(_Result);
            }).catch(function (err) {
                res.json({ "Error": "加入黑名單標籤出現錯誤, 原因:" + err });
            })
        }).catch(function (err) {
            res.json({ "Error": "加入黑名單標籤出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}

// 更新標籤統計人數
exports._AddTagUserCount = function (req, res) {
    var PageID = req.body.PageID;
    var TagArray = req.body.TagArray;
    if (PageID && TagArray) {
        var tag = new TagModel(PageID, null, null, null, TagArray);
        tag.addTagUserCount(tag.pageID, tag.tagArray).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "更新標籤統計人數出現錯誤, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入對應參數" });
    }
}