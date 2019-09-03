var requestPromise = require('request-promise');
var db = require('../../db/firebase_db.js');

// 設定智慧常駐選單
exports._SetMenu = function (req, res) {
    var PageID = req.body.PageID;
    var WebURL = req.body.WebURL;
    if (PageID && WebURL) {
        db._onValuePromise("EilisFB/" + PageID + "/PageBasicData", "PageToken").then(function (_PageToken) {
            AddPermanentMenu(WebURL, PageID, _PageToken).then(function () {
                res.json({ "Message": "智慧常駐選單設定成功" });
            }).catch(function (err) {
                res.json({ "Error": "智慧常駐選單設定失敗, 原因:" + err });
            })
        }).catch(function (err) {
            res.json({ "Error": "智慧常駐選單設定失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "沒有傳入專頁的代碼或官方網站連結" });
    }
}

//加入主選單
function AddPermanentMenu(webURL, pageID, pageToken) {
    var options = {
        uri: 'https://graph.facebook.com/v2.6/me/thread_settings/',
        qs: { access_token: pageToken },
        method: 'POST',
        body: {
            setting_type: "call_to_actions",
            thread_state: "existing_thread",
            call_to_actions: [
                {
                    type: "postback",
                    title: "主選單",
                    payload: "公版主選單"
                },
                {
                    type: "web_url",
                    title: "前往官方網站",
                    url: webURL.toString()
                },
                {
                    type: "web_url",
                    title: "系統提供by Eilis艾莉思智慧小助手",
                    url: "http://www.eilis-ai.com"
                }
            ]
        },
        json: true
    };

    return requestPromise(options).then(function (parsedBody) {
        return db._update("EilisFB/" + pageID + "/ServiceSetting", "AddPermanentMenu", options).then(function () {
            return Promise.resolve("加入主選單成功");
        }).catch(function (err) {
            return Promise.reject("儲存FB專頁加入主選單設定失敗, 原因:" + err);
        })
    }).catch(function (err) {
        return Promise.reject("加入主選單失敗, 原因:" + err);
    });
}

