var requestPromise = require('request-promise');
var db = require('../../db/firebase_db.js');

//加入開始使用按鈕
exports._SetStartButton = function (req, res) {
    var PageToken = req.body.PageToken;
    var PageID = req.body.PageID;
    if (PageID && PageToken) {
        AddGetStartButton(PageID, PageToken).then(function (_Response) {
            res.json({ "Message": "開始使用按鈕設定完成" });
        }).catch(function (err) {
            res.json({ "Error": "設定開始使用功能出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "沒有傳入專頁的代碼" });
    }
}

//使用前聊天視窗背景問候語
exports._SetGreeting = function (req, res) {
    var PageID = req.body.PageID;
    var GreetingText = req.body.GreetingText;
    if (PageID && GreetingText) {
        db._onValuePromise("EilisFB/" + PageID + "/PageBasicData", "PageToken").then(function (_PageToken) {
            AddFirstGreeting(GreetingText, PageID, _PageToken).then(function (_Response) {
                res.json({ "Message": "招呼語設定完成" });
            }).catch(function (err) {
                res.json({ "Error": "設定招呼語功能出現錯誤, 原因:" + err });
            });
        }).catch(function (err) {
            res.json({ "Error": "設定招呼語功能出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "沒有傳入專頁的代碼或招呼語" });
    }
}

// 設定互動引導文字
exports._SetGuideHint = function(req, res){
    var PageID = req.body.PageID;
    var HintText = req.body.HintText;
    if (PageID && HintText) {
        var Ref = "EilisFB/" + PageID;
        var ChildName = "EilisHintData";
        var HintData = {
            "HintText": HintText
        }
        db._set(Ref, ChildName, HintData).then(function () {
            res.json({ "Message": "引導文字設定成功" });
        }).catch(function (err) {
            res.json({ "Error": "設定引導文字出現錯誤, 原因:" + err });
        });
    }
    else{
        res.json({ "Error": "未傳入專頁代碼或引導文字，設定失敗" });
    }
}

//設定第一次點擊開始使用後的問候語
exports._SetWelcomeAbroad = function (req, res) {
    var PageID = req.body.PageID;
    var WelcomeText = req.body.WelcomeText;
    if (PageID && WelcomeText) {
        var EilisWelcomeData = {
            "WelcomeText": WelcomeText,
        }
        db._update("EilisFB/" + PageID, "EilisWelcomeData", EilisWelcomeData).then(function () {
            res.json({ "Message": "開始使用後問候語設定完成" });
        }).catch(function (err) {
            res.json({ "Error": "設定開始使用後問候語出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "沒有傳入專頁的代碼或問候語" });
    }
}

//加入開始使用按鈕
function AddGetStartButton(pageID, pageToken) {
    var options = {
        uri: 'https://graph.facebook.com/v2.6/me/thread_settings/',
        qs: { access_token: pageToken },
        method: 'POST',
        body: {
            setting_type: "call_to_actions",
            thread_state: "new_thread",
            call_to_actions: [
                {
                    payload: "開始使用"
                }
            ]
        },
        json: true
    };

    return requestPromise(options).then(function (parsedBody) {
        db._update("EilisFB/" + pageID + "/ServiceSetting", "AddGetStartButton", options).then(function () {
            return Promise.resolve("加入開始使用按鈕成功");
        }).catch(function (err) {
            return Promise.reject("儲存FB專頁加入開始按鈕設定失敗, 原因:" + err);
        })
    }).catch(function (err) {
        return Promise.reject("加入開始使用按鈕失敗, 原因:" + err);
    });
}

//設定使用前聊天視窗背景問候語
function AddFirstGreeting(greetingText, pageID, pageToken) {
    var options = {
        uri: 'https://graph.facebook.com/v2.6/me/thread_settings/',
        qs: { access_token: pageToken },
        method: 'POST',
        body: {
            setting_type: "greeting",
            greeting: {
                text: greetingText
            },
        },
        json: true
    };

    return requestPromise(options).then(function (parsedBody) {
        db._update("EilisFB/" + pageID + "/ServiceSetting", "AddGreeting", options).then(function () {
            return Promise.resolve("加入問候語成功");
        }).catch(function (err) {
            return Promise.reject("儲存FB專頁加入問候語設定失敗, 原因:" + err);
        })
    }).catch(function (err) {
        return Promise.reject("加入問候語失敗, 原因:" + err);
    });
}

