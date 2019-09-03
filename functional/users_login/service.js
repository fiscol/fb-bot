const FB = require('fb');
const Step = require('step');
const config = require('../../config/login_default.js');
const errorLog = require('../../tool/ErrorLog.js');

//Model
const LoginUser = require('./models/login_user_model.js');
const UserData = require('./models/user_data_model.js');

FB.options({
    appId: config.facebook.appId,
    appSecret: config.facebook.appSecret,
    redirectUri: config.facebook.redirectUri
});

/** FB的OAuth登入與取得AccessToken
// 參考資源:
// https://gigenchang.wordpress.com/2014/01/26/10分鐘理解oauth和facebook登入原理/
// https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
**/

//*** DEV用, 暫存跳轉回系統的URL
var RedirectToEilis = "";
// Eilis優惠碼
var RedirectWithBonusCode = ""

// 取得Facebook OAuth第一階段認證後, 導頁到redirect_uri
exports._LoginEilis = function (req, res) {
    if (req.query.Redirect) {
        console.log("RedirectToEilis:" + req.query.Redirect);
        if (req.query.BonusCode) {
            console.log("RedirectWithBonusCode:" + req.query.BonusCode);
            RedirectWithBonusCode = req.query.BonusCode;
        }
        RedirectToEilis = req.query.Redirect;
    }
    // 要求下列的個人同意權限後，會參考config/login_default.js的redirectUri
    // 跳轉至下方的_SaveUserFBDetail取得管理粉專，用戶個人資訊
    return res.redirect(FB.getLoginUrl({ scope: 'user_about_me,user_photos,public_profile,email,manage_pages,pages_messaging,pages_messaging_subscriptions,pages_show_list,read_page_mailboxes,publish_pages' }));
}

// 取得用戶Token, FB個人資料與管理粉絲專頁資訊, 寫入DB後, 導頁到後台
exports._SaveUserFBDetail = function (req, res) {
    try {
        // code是FB處理過後加入到redirect_uri的url query參數
        var code = req.query.code;
        console.log('code: ' + code);
        if (req.query.error) {
            // user might have disallowed the app
            res.json({ 'Error': "儲存使用者FB資訊出現錯誤, 原因:" + req.query.error_description });
        } else if (!code) {
            res.json({ 'Error': "儲存使用者FB資訊出現錯誤, 原因: FB轉址功能錯誤" });
        }
        else {
            console.log("query:" + JSON.stringify(req.query));
            Step(
                //透過code取得token(短期)
                function exchangeCodeForAccessToken() {
                    console.log('step1');
                    FB.napi('oauth/access_token', {
                        client_id: FB.options('appId'),
                        client_secret: FB.options('appSecret'),
                        redirect_uri: FB.options('redirectUri'),
                        code: code,
                    }, this);
                },
                //取得token(長期)
                function extendAccessToken(err, result) {
                    console.log('step2');
                    if (err) {
                        errorLog._ErrorLogToDB("step2取得token出現錯誤:" + err);
                        res.json({ "Error": "Get User Token Error." });
                    };
                    FB.napi('oauth/access_token', {
                        client_id: FB.options('appId'),
                        client_secret: FB.options('appSecret'),
                        grant_type: 'fb_exchange_token',
                        fb_exchange_token: result.access_token
                    }, this);
                },
                function (err, result) {
                    console.log('step3');
                    // 如果重複操作，倒返回前頁重新登入
                    if (err) {
                        errorLog._ErrorLogToDB("step3取得token出現錯誤:" + err);
                        res.json({ "Error": "Get User Token Error." });
                    };

                    req.session.access_token = result.access_token;
                    req.session.expires = result.expires || 0;
                    FB.setAccessToken(result.access_token);
                    var UserToken = result.access_token;
                    // 取得管理FB粉絲專頁資訊
                    FB.api('/me/accounts?limit=500' + UserToken, function (result) {
                        console.log('取得管理粉絲專頁資訊清單');
                        console.log(result);
                        if (!result || result.error) {
                            res.json({ 'Error': "取得管理粉絲專頁清單出現錯誤" });
                        } else {
                            // 取得使用者FB帳號資訊
                            FB.api('/me', { fields: 'id,name,email,picture.width(160).height(160)', access_token: result.access_token }, function (BasicResult) {
                                console.log('我的個人資訊' + JSON.stringify(BasicResult));
                                if (!BasicResult || BasicResult.error) {
                                    res.json({ "Error": "取得個人資訊出現錯誤" });
                                }
                                else {
                                    var loginUser = new LoginUser(result, BasicResult, UserToken);
                                    // 產製新的WebToken
                                    GenerateWebToken(BasicResult.id).then(function (_WebTokenResult) {
                                        // 註冊使用者資訊model

                                        /* 登入成功且寫入使用者資料到DB, 導頁至後台介面 */
                                        // DEV: 串接用, 暫時接Mark本機的API
                                        if (RedirectToEilis) {
                                            // 優惠碼特殊判斷, 更新優惠天數後導頁回系統
                                            var BonusDays = 30;
                                            var BonusCode = (RedirectWithBonusCode == "") ? "None" : RedirectWithBonusCode;
                                            switch (BonusCode) {
                                                // FITI優惠碼 - 60天免費使用(699試用)
                                                case "FITI0819":
                                                    BonusDays = 60;
                                                    break;
                                                // 生洋廣告優惠碼 - 45天免費使用(699試用)
                                                case "SayaClients":
                                                    BonusDays = 45;
                                                    break;
                                                // Eilis Special優惠碼 - 45天免費使用(商務版試用, 贈送廣播則數為5000則)
                                                case "EilisSpecialCode":
                                                    BonusDays = 45;
                                                    break;
                                                // 其他無法識別優惠碼 - 仍導引使用，免費天數為預設的30天
                                                default:
                                                    BonusDays = 30;
                                                    break;
                                            }
                                            RedirectWithBonusCode = "";
                                            loginUser.SaveUserBasicData(loginUser.fansPageInfo, loginUser.userDetail, loginUser.userToken, _WebTokenResult.WebToken, BonusCode, BonusDays).then(function () {
                                                res.redirect(RedirectToEilis + "?UserID=" + BasicResult.id + "&WebToken=" + _WebTokenResult.WebToken);
                                            }).catch(function (err) {
                                                errorLog._ErrorLogToDB("儲存使用者FB資訊至DB出現錯誤:" + err);
                                                res.json({ "Error": "Saving User Data Error." });
                                            });
                                        }
                                        else {
                                            res.json({ "Error": "Wrong Parameter." });
                                        }
                                    }).catch(function (err) {
                                        errorLog._ErrorLogToDB("產製WebToken出現錯誤:" + err);
                                        res.json({ "Error": "Generate WebToken Error." });
                                    });
                                }
                            });
                        }
                    });
                }
            );
        }
    }
    catch (err) {
        res.json("Login Failed:" + err);
    }
}

// 回傳使用者FB資料api
exports._GetFBData = function (req, res) {
    var userID = req.body.UserID;
    if (userID) {
        var userData = new UserData(req.body.UserID);
        userData._CheckUserToken(userData.userID).then(function (_UserToken) {
            // 用戶的UserToken沒有存到DB(舊版, 直接回傳DB裡面的管理粉專, 需要重新登入EILIS, 才能使用新版邏輯動態更新管理粉專)
            if (_UserToken == false) {
                userData._GetFBData(userData.userID).then(function (_UserData) {
                    res.json(_UserData);
                }).catch(function (err) {
                    res.json({ "Error": "取得使用者FB資料失敗, 原因:" + err });
                })
            }
            // 用戶的UserToken有存到DB(新版, 取得更新的管理粉專後, 回傳給用戶)
            else {
                FB.setAccessToken(_UserToken);
                // 取得管理FB粉絲專頁資訊
                FB.api('/me/accounts?limit=80' + _UserToken, function (result) {
                    console.log('取得管理粉絲專頁資訊清單');
                    console.log(result);
                    if (!result || result.error) {
                        res.json({ 'Error': "取得管理粉絲專頁清單出現錯誤" });
                    } else {
                        var loginUser = new LoginUser(result, null, _UserToken);
                        // 儲存更新粉專資訊
                        loginUser.SaveUserFansPageData(loginUser.fansPageInfo, userData.userID).then(function () {
                            // 從DB讀取管理粉專資訊
                            userData._GetFBData(userData.userID).then(function (_UserData) {
                                res.json(_UserData);
                            }).catch(function (err) {
                                res.json({ "Error": "取得使用者FB資料失敗, 原因:" + err });
                            })
                        }).catch(function (err) {
                            errorLog._ErrorLogToDB("儲存使用者FB資訊至DB出現錯誤:" + err);
                            res.json({ "Error": "Saving User Data Error." });
                        });
                    }
                });
            }
        }).catch(function (err) {
            res.json({ "Error": "取得使用者FB資料失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "沒有找到對應的使用者ID" });
    }
}

// 透過排程更新用戶的免費試用天數(功能已完成，目前尚未啟用)
exports._RefreshBonusDays = function () {
    var userData = new UserData(null);
    userData._RefreshBonusDays().then(function (_Result) {
        console.log("Daily Schedule:" + _Result);
    }).catch(function (err) {
        errorLog._ErrorLogToDB("Daily Schedule Error:" + err);
    });
}

// 驗證WebToken
exports._VerifyWebToken = function (headers) {
    return new Promise((resolve, reject) => {
        var UserID = headers.userid;
        var WebToken = headers.webtoken;
        if (UserID && WebToken) {
            var userData = new UserData(UserID);
            userData._VerifyWebToken(userData.userID, WebToken).then(function (_Result) {
                return resolve(_Result);
            }).catch(function (err) {
                return reject(err);
            });
        }
        else {
            return reject({ "Error": "沒有傳入對應的使用者ID及WebToken" });
        }
    });
}

// 登出Eilis
exports._LogoutEilis = function (req, res) {
    var UserID = req.headers.userid;
    var WebToken = req.headers.webtoken;
    if (UserID && WebToken) {
        var userData = new UserData(UserID);
        userData._LogoutEilis(userData.userID, WebToken).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.status(403).json(err);
        });
    }
    else {
        res.status(403).json({ "Error": "沒有傳入對應的使用者ID及WebToken" });
    }
}

// 透過UserID更新WebToken(兩週內有效)
function GenerateWebToken(UserID) {
    return new Promise((resolve, reject) => {
        var userData = new UserData(UserID);
        userData._GenerateWebToken(userData.userID).then(function (_Result) {
            return resolve(_Result);
        }).catch(function (err) {
            return reject({ "Error": "更新WebToken出現錯誤，原因:" + err });
        });
    });
}

// 互動用戶透過Messenger互動同意登入權限, 取得Email, UserID
exports._PSIDLogin = function (req, res) {
    var redirectUri = 'https://api.eilis-ai.com/functional/SaveUserID';
    // 有取得對應的登入卡片按鈕參數
    if (req.query.PSID && req.query.PageID && req.query.CardID && req.query.ButtonID) {
        redirectUri += "?PSID=" + req.query.PSID + "&PageID=" + req.query.PageID + "&CardID=" + req.query.CardID + "&ButtonID=" + req.query.ButtonID;
        if (req.query.CardAt) {
            redirectUri += "&CardAt=" + req.query.CardAt;
        }
        console.log("PSIDLogin:" + redirectUri);
        return res.redirect(FB.getLoginUrl({ scope: 'user_about_me,user_photos,public_profile,email', redirect_uri: redirectUri }));
    }
    // 登入失敗
    else {
        errorLog._ErrorLogToDB("沒有取得正確的登入卡片參數，用戶登入失敗");
        return res.redirect("https://m.me/" + req.query.PageID);
    }
}

// 取得用戶Token, FB個人資料與管理粉絲專頁資訊, 寫入DB後, 導頁到後台
exports._SaveUserID = function (req, res) {
    try {
        // code是FB處理過後加入到redirect_uri的url query參數
        var code = req.query.code;
        console.log('code: ' + code);
        if (req.query.error) {
            // user might have disallowed the app
            res.json({ 'Error': "儲存使用者FB資訊出現錯誤, 原因:" + req.query.error_description });
        } else if (!code) {
            res.json({ 'Error': "儲存使用者FB資訊出現錯誤, 原因: FB轉址功能錯誤" });
        }
        else {
            console.log("query:" + JSON.stringify(req.query));
            var RedirectUrl = 'https://api.eilis-ai.com/functional/SaveUserID?PSID=' + req.query.PSID + '&PageID=' + req.query.PageID + '&CardID=' + req.query.CardID + '&ButtonID=' + req.query.ButtonID;
            if (req.query.CardAt) {
                RedirectUrl += "&CardAt=" + req.query.CardAt;
            }
            console.log("SaveUserID:" + RedirectUrl);
            Step(
                //透過code取得token(短期)
                function exchangeCodeForAccessToken() {
                    console.log('step1');
                    FB.napi('oauth/access_token', {
                        client_id: FB.options('appId'),
                        client_secret: FB.options('appSecret'),
                        redirect_uri: RedirectUrl,
                        code: code,
                    }, this);
                },
                function (err, result) {
                    console.log('step2');
                    // 如果重複操作，倒返回前頁重新登入
                    if (err) {
                        errorLog._ErrorLogToDB("step2取得token出現錯誤:" + err);
                        res.json({ "Error": "Get User Token Error." });
                    };
                    FB.setAccessToken(result.access_token);
                    var UserToken = result.access_token;
                    // 取得使用者FB帳號資訊
                    FB.api('/me', { fields: 'id,name,email,picture.width(160).height(160)', access_token: UserToken }, function (BasicResult) {
                        console.log('我的UserData:' + JSON.stringify(BasicResult));
                        if (!BasicResult || BasicResult.error) {
                            res.json({ "Error": "取得個人資訊出現錯誤" });
                        }
                        else {
                            var loginUser = new LoginUser(result, BasicResult, UserToken);
                            var CardAt = req.query.CardAt || null;
                            // 儲存用戶的UserID, Email資料到粉專的PSID內
                            loginUser.SaveUserInfoToPSID(req.query.PageID, req.query.PSID, req.query.CardID, req.query.ButtonID, CardAt, BasicResult).then(function (_RedirectUrl) {
                                res.redirect(_RedirectUrl);
                                // 桌面版的用戶導頁
                                // if (req.device.type.toUpperCase() == "DESKTOP") {
                                //     res.redirect("https://api.eilis-ai.com/view/Desktop-Login");
                                // }
                                // // 手機 or 平板的用戶導頁
                                // else {
                                //     res.redirect("https://m.me/" + req.query.PageID);
                                // }
                            }).catch(function (err) {
                                errorLog._ErrorLogToDB("儲存使用者FB資訊至DB出現錯誤:" + err);
                                res.json({ "Error": "Saving User Data Error." });
                            });
                            // res.json({ "PSID": req.query.PSID, "UserID": BasicResult.id, "Email": BasicResult.email });
                        }
                    });
                }
            );
        }
    }
    catch (err) {
        res.json("Login Failed:" + err);
    }
}