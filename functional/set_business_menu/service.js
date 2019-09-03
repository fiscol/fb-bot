var requestPromise = require('request-promise');
var db = require('../../db/firebase_db.js');

// 設定智慧常駐選單
exports._SetMenu = function (req, res) {
    var PageID = req.body.PageID;
    var MenuData = req.body.MenuData;
    var MessageInput = (req.body.MessageInput == null || req.body.MessageInput.toLowerCase() == "on") ? true : false;
    if (PageID && MenuData && MessageInput != null) {
        db._onValuePromise("EilisFB/" + PageID + "/PageBasicData", "PageToken").then(function (_PageToken) {
            AddPermanentMenu(MenuData, MessageInput, PageID, _PageToken).then(function () {
                res.json({ "Message": "智慧常駐選單設定成功" });
            }).catch(function (err) {
                res.json({ "Error": "智慧常駐選單設定失敗, 原因:" + err });
            })
        }).catch(function (err) {
            res.json({ "Error": "智慧常駐選單設定失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "沒有傳入正確的設定參數" });
    }
}

// 回傳智慧常駐選單設定
exports._GetMenu = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        GetPermanentMenu(PageID).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "智慧常駐選單讀取失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "沒有傳入專頁的代碼" });
    }
}

// 開啟/關閉用戶對話框
exports._SwitchMessageInput = function (req, res) {
    var PageID = req.body.PageID;
    var MessageInput = (req.body.MessageInput.toLowerCase() == "on") ? true : false;
    if (PageID && MessageInput != null) {
        db._onValuePromise("EilisFB/" + PageID + "/PageBasicData", "PageToken").then(function (_PageToken) {
            SwitchMessageInput(PageID, MessageInput, _PageToken).then(function(_Result) {
                res.json({ "Message": "開啟/關閉用戶對話框設定成功" });
            }).catch(function (err) {
                res.json({ "Error": "開啟/關閉用戶對話框設定失敗, 原因:" + err });
            })
        }).catch(function (err) {
            res.json({ "Error": "開啟/關閉用戶對話框設定失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "沒有傳入正確的設定參數" });
    }
}

//加入主選單
function AddPermanentMenu(menuData, messageInput, pageID, pageToken) {
    // menuData以陣列格式傳入, Content分成4種
    // 1.URL
    // {
    //     "Type":"Url",
    //     "Title":"到我們的官方網站看看",
    //     "Url":"http://www.eilis-ai.com"
    // }
    // 2.Payload
    // {
    //     "Type":"Payload",
    //     "Title":"卡片1"
    // }
    // 3.Menu
    // {
    //     "Type":"Menu"
    // }
    // 4.Eilis
    // {
    //     "Type":"Eilis"
    // }
    var options = {
        uri: 'https://graph.facebook.com/v2.6/me/messenger_profile/',
        qs: { access_token: pageToken },
        method: 'POST',
        body: {
            persistent_menu: [{
                locale: "default",
                call_to_actions: [],
                composer_input_disabled: (messageInput == true) ? false : true
            }],
        },
        json: true
    };
    // 解析menuData
    for (var i = 0; i < menuData.length; i++) {
        var Setting = SetFBMenuData(menuData[i]);
        if (Setting != null) {
            if (i < 2 || (i == 2 && menuData.length == 3)) {
                options.body.persistent_menu[0].call_to_actions.push(Setting);
            }
            else {
                if (i == 2) {
                    options.body.persistent_menu[0].call_to_actions.push({
                        title: "更多功能",
                        type: "nested",
                        call_to_actions: []
                    });
                }
                options.body.persistent_menu[0].call_to_actions[2].call_to_actions.push(Setting);
            }
        }
    }
    return requestPromise(options).then(function (parsedBody) {
        return db._update("EilisFB/" + pageID + "/ServiceSetting", "AddPermanentMenu", options).then(function () {
            var GetStartedOptions = Object.assign({}, options);
            GetStartedOptions["body"] = {
                "get_started": {
                    "payload": "開始使用"
                }
            }
            return db._update("EilisFB/" + pageID + "/ServiceSetting", "AddGetStartButton", GetStartedOptions).then(function () {
                return Promise.resolve("加入主選單成功");
            }).catch(function (err) {
                return Promise.reject("儲存FB專頁加入主選單設定失敗, 原因:" + err);
            })
        }).catch(function (err) {
            return Promise.reject("儲存FB專頁加入主選單設定失敗, 原因:" + err);
        })
    }).catch(function (err) {
        return Promise.reject("加入主選單失敗, 原因:" + err);
    });
}

//取得主選單
function GetPermanentMenu(pageID) {
    return db._onValuePromise("EilisFB/" + pageID + "/ServiceSetting", "AddPermanentMenu").then(function (_MenuSetting) {
        if (_MenuSetting != null) {
            var Result = {
                "PageID": pageID,
                "MenuData": [],
                "MessageInput": "On"
            };
            // 新版架構
            if (_MenuSetting.body.hasOwnProperty("persistent_menu")) {
                var MenuData = _MenuSetting.body.persistent_menu[0].call_to_actions;
                // 解析menuData
                for (var i = 0; i < MenuData.length; i++) {
                    var Setting = GetEditMenuData(MenuData[i]);
                    if (Setting != null && Setting.Type != "Nested") {
                        if (i < 2 || (i == 2 && MenuData.length == 3)) {
                            Result.MenuData.push(Setting);
                        }
                    }
                    else if (Setting.Type == "Nested") {
                        var NestedMenuData = MenuData[i].call_to_actions;
                        for (var j = 0; j < NestedMenuData.length; j++) {
                            var NestedSetting = GetEditMenuData(NestedMenuData[j]);
                            if (NestedSetting != null) {
                                Result.MenuData.push(NestedSetting);
                            }
                        }
                    }
                }
                if (_MenuSetting.body.persistent_menu[0].composer_input_disabled == true) {
                    Result.MessageInput = "Off";
                }
            }
            // 舊版架構
            else {
                var MenuData = _MenuSetting.body.call_to_actions;
                // 解析menuData
                for (var i = 0; i < MenuData.length; i++) {
                    var Setting = GetEditMenuData(MenuData[i]);
                    if (Setting != null) {
                        Result.MenuData.push(Setting);
                    }
                }
            }
            return Promise.resolve(Result);
        }
    }).catch(function (err) {
        return Promise.reject("取得主選單設定失敗, 原因:" + err);
    })
}

// 開啟/關閉用戶對話框
function SwitchMessageInput(pageID, messageInput, pageToken) {
    return GetPermanentMenu(pageID).then(function (_SettingData) {
        return AddPermanentMenu(_SettingData.MenuData, messageInput, pageID, pageToken).then(function () {
            return Promise.resolve("開啟/關閉用戶對話框成功");
        }).catch(function (err) {
            return Promise.reject("開啟/關閉用戶對話框設定失敗, 原因:" + err);
        })
    }).catch(function (err) {
        return Promise.reject("開啟/關閉用戶對話框設定失敗, 原因:" + err);
    })
}

// 解析MenuData為FB資料格式
var SetFBMenuData = function (menuData) {
    var Setting;
    if (menuData.Type == "Url") {
        Setting = {
            type: "web_url",
            title: menuData.Title,
            url: menuData.Url,
            webview_height_ratio: "full"
        };
    }
    else if (menuData.Type == "Payload") {
        Setting = {
            type: "postback",
            title: menuData.Title,
            payload: menuData.Title
        };
    }
    else if (menuData.Type == "Menu") {
        Setting = {
            type: "postback",
            title: "主選單",
            payload: "公版主選單"
        };
    }
    else if (menuData.Type == "Eilis") {
        Setting = {
            type: "web_url",
            title: "系統提供by Eilis艾莉思智慧小助手",
            url: "http://www.eilis-ai.com"
        };
    }
    return Setting;
}

// 解析MenuData為編輯格式
var GetEditMenuData = function (menuData) {
    var Setting;
    if (menuData.type == "web_url" && menuData.title != "系統提供by Eilis艾莉思智慧小助手") {
        Setting = {
            Type: "Url",
            Title: menuData.title,
            Url: menuData.url
        };
    }
    else if (menuData.type == "postback" && menuData.title != "主選單") {
        Setting = {
            Type: "Payload",
            Title: menuData.title
        };
    }
    else if (menuData.type == "postback" && menuData.title == "主選單") {
        Setting = {
            Type: "Menu"
        };
    }
    else if (menuData.type == "web_url" && menuData.title == "系統提供by Eilis艾莉思智慧小助手") {
        Setting = {
            Type: "Eilis"
        };
    }
    else if (menuData.type == "nested") {
        Setting = {
            Type: "Nested"
        };
    }
    return Setting;
}