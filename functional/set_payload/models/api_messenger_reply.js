var db = require('../../../db/firebase_db.js');

var APIMessengerReply = function (pageID, keywords, status, url) {
    this.pageID = pageID;
    this.keywords = keywords;
    this.status = status;
    this.url = url;
}

APIMessengerReply.prototype.SetReplySetting = function (APIMessengerReply) {
    return new Promise((resolve, reject) => {
        // 預設最多加入5組關鍵字設定
        if (APIMessengerReply.keywords.length != 0 && APIMessengerReply.keywords.length > 5) {
            APIMessengerReply.keywords = APIMessengerReply.keywords.slice(0, 5);
        }
        var ReplySetting = {
            "Keywords": APIMessengerReply.keywords,
            "Status": APIMessengerReply.status,
            "Url": APIMessengerReply.url
        }
        db._update("EilisFB/" + APIMessengerReply.pageID, "EilisAPICard", ReplySetting).then(function () {
            resolve({ "Message": "加入私訊自動回覆設定成功" });
        }).catch(function (err) {
            reject(err);
        })
    })
}

APIMessengerReply.prototype.GetAPIMessengerSetting = function (APIMessengerReply) {
    return new Promise((resolve, reject) => {
        db._onValuePromise("EilisFB/" + APIMessengerReply.pageID, "EilisAPICard").then(function (_APISetting) {
            if (_APISetting != null) {
                _APISetting["PageID"] = APIMessengerReply.pageID;
                resolve(_APISetting);
            }
            else{
                reject("沒有找到對應的API對接私訊卡片設定!");
            }
        }).catch(function (err) {
            reject(err);
        })
    })
}

module.exports = APIMessengerReply;