//Models
var SmartPayPayment = require('./models/smart_pay_model.js');
var SmartPayResult = require('./models/smart_pay_result_model.js');
var Pay2Go = require('./models/pay2go_model.js');
var Config = require('../../config/smart_pay_config.js');

var db = require('../../db/firebase_db.js');

//儲存Prime Key及部分使用者資訊到DB
exports._SetPayBasicData = function (req, res) {
    // var PrimeKey = req.body.PrimeKey;
    var UserID = req.body.UserID;
    var PhoneNumber = req.body.PhoneNumber;
    var FirstName = req.body.FirstName;
    var LastName = req.body.LastName;
    var Email = req.body.Email;
    var BusinessType = req.body.BusinessType;
    var Address = req.body.Address;
    var CompanyName = req.body.CompanyName;
    var UniformNumber = req.body.UniformNumber;
    if (UserID && PhoneNumber && FirstName && LastName) {
        // 產智付通記憶卡號的Token
        var smartPay = new SmartPayPayment(UserID, null, null, null, null, null);
        var SmartToken = smartPay.genSmartToken();

        var Ref = "EilisUser/" + UserID + "/UserBasicData";
        var Childname = "CardKeys";
        var Data = {
            // "PrimeKey": PrimeKey,
            "PhoneNumber": PhoneNumber,
            "FirstName": FirstName,
            "LastName": LastName,
            "SmartToken": SmartToken
        }
        if (Email) {
            Data.Email = Email;
        }
        if (BusinessType) {
            if (BusinessType == "B2B") {
                Data.Category = BusinessType;
                Data.BuyerName = CompanyName;
                Data.BuyerAddress = Address;
                Data.BuyerUBN = UniformNumber;
            }
            else if (BusinessType == "B2C") {
                Data.BuyerAddress = Address;
                Data.BuyerName = Data.FirstName + " " + Data.LastName;
            }
        }
        db._update(Ref, Childname, Data).then(function (_Result) {
            res.json({ "Message": "儲存成功" });
        }).catch(function (err) {
            res.json({ "Error": "儲存使用者資訊失敗, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，儲存使用者資訊未成功" });
    }
}

//智付寶一次性付款功能
exports._PayWithSmartPay = function (req, res) {
    //把PrimeKey改由DB查詢
    var UserID = req.body.UserID;
    var Product = req.body.Product;
    if (UserID && Product) {
        //查詢資料庫, 取得用戶Email
        db._onValuePromise("EilisUser/" + UserID, "UserBasicData").then(function (_UserBasicData) {
            if (_UserBasicData.Email) {
                var Email = _UserBasicData.Email;
                var payment = new SmartPayPayment(UserID, null, Email, null, null, Product);
                // 取得付款總額, 完整購買服務清單
                var RefPath = "EilisData/ProductSpec";
                var ChildName = payment.Product;
                db._onValuePromise(RefPath, ChildName).then(function (_SpecData) {
                    if (_SpecData != null) {
                        var ProductPrice = _SpecData["Price"];
                        var ProductDetail = _SpecData["Detail"]
                        if (ProductPrice && ProductDetail) {
                            payment.payBySmartPay(ProductPrice, ProductDetail).then(function (_Result) {
                                res.json(_Result);
                            }).catch(function (err) {
                                res.json({ "Error": "傳送至第三方支付商發生錯誤，繳費作業未成功，原因：" + err });
                            });
                        }
                    }
                    else {
                        res.json({ "Error": "找不到對應的商品，繳費作業未成功" });
                    }
                }).catch(function (err) {
                    res.json({ "Error": "找不到對應的商品，繳費作業未成功" });
                })
            }
            else {
                res.json({ "Error": "沒有找到使用者的電子信箱資訊" });
            }
        }).catch(function (err) {
            res.json({ "Error": "沒有找到正確的使用者資訊" });
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數，繳費作業未成功" });
    }
}

//智付通一次性付款成功
exports._SmartPaySucceed = function (req, res) {
    var UserID = req.query.UserID;
    var Product = req.query.Product;
    var payResult = new SmartPayResult(UserID, Product);
    payResult.processOnceTrade(req.body.JSONData).then(function () {
        res.redirect(Config.OncePaySucceedUri + "?UserID=" + UserID + "&Product=" + Product);
    }).catch(function (err) {
        res.json({ "Error": err });
    })
}

//智付寶定期定額功能
exports._PayWithSmartPayPeriod = function (req, res) {
    //把PrimeKey改由DB查詢
    var UserID = req.body.UserID;
    if (UserID) {
        //查詢資料庫, 取得用戶Email
        db._onValuePromise("EilisUser/" + UserID, "UserBasicData").then(function (_UserData) {
            // if (_UserData["CardKeys"].Email && _UserData["CardKeys"].SmartToken) {
            //var Email = _UserData["CardKeys"].Email;
            //var SmartToken = _UserData["CardKeys"].SmartToken;
            var Email = _UserData["Email"];
            var BonusDays = _UserData["BonusDays"];
            var payment = new SmartPayPayment(UserID, null, Email, null, BonusDays, null);
            // 取得付款總額, 完整購買服務清單
            payment.getPeriodPayDetail(payment.UserID).then(function (_PeriodPayDetail) {
                if (_PeriodPayDetail.Price && _PeriodPayDetail.Detail) {
                    payment.payBySmartPayPeriod(_PeriodPayDetail.Price, _PeriodPayDetail.Detail).then(function (_Result) {
                        res.json(_Result);
                    }).catch(function (err) {
                        res.json({ "Error": "傳送至第三方支付商發生錯誤，設定定期定額作業未成功，原因：" + err });
                    });
                }
                else {
                    res.json({ "Error": "設定付款功能出現錯誤，沒有找到對應的服務頁面" });
                }
            }).catch(function (err) {
                res.json({ "Error": "取得付款總額出現錯誤，設定定期定額作業未成功，原因：" + err });
            });
            // }
            // else {
            //     res.json({ "Error": "使用者尚未加入信用卡綁定到Eilis服務" });
            // }
        }).catch(function (err) {
            res.json({ "Error": "使用者尚未加入信用卡綁定到Eilis服務" });
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數，設定定期定額作業未成功" });
    }
}

//智付通定期定額設定成功
exports._SmartPayPeriodSucceed = function (req, res) {
    var UserID = req.params.UserID;
    var payResult = new SmartPayResult(UserID, null);
    payResult.processPeriodAuth(req.body.Period).then(function () {
        res.redirect(Config.PeriodPaySucceedUri);
    }).catch(function (err) {
        res.json({ "Error": err });
    });
    // console.log("Req:" + JSON.stringify(req.query));
    // console.log("Referer:" + req.headers.referer);
}

//智付通定期定額單次支付成功
exports._SmartPayPeriodNotify = function (req, res) {
    var UserID = req.params.UserID;
    var payResult = new SmartPayResult(UserID, null);
    payResult.processPeriodPay(req).then(function () {
        res.send({ "Message": "支付成功" });
    }).catch(function (err) {
        db._push('EilisUser/' + UserID + '/TradeInfo', 'PurchasedService', { Error: err });
        res.send({ "Error": err });
    })
}

//回傳一次性付款歷史交易紀錄
exports._GetOncePayHistory = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        var payment = new SmartPayPayment(UserID, null, null, null, null, null);
        // 取得歷史交易紀錄
        payment.getOncePayHistory(payment.UserID).then(function (_OncePayHistory) {
            res.json(_OncePayHistory);
        }).catch(function (err) {
            res.json({ "Error": "取得歷史交易紀錄未成功，原因：" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，取得歷史交易紀錄未成功" });
    }
}

//回傳專頁已建立的定期定額付款授權
exports._GetPeriodPayAuth = function (req, res) {
    var UserID = req.body.UserID;
    if (UserID) {
        var payment = new SmartPayPayment(UserID, null, null, null, null, null);
        // 取得付款授權
        payment.getPeriodPayAuth(payment.UserID).then(function (_PeriodPayAuth) {
            res.json(_PeriodPayAuth);
        }).catch(function (err) {
            res.json({ "Error": "取得定期定額付款授權未成功，原因：" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，取得定期定額付款授權未成功" });
    }
}

//手動由客服協助設定付費狀態(匯款等方式)
exports._PayByOtherWay = function (req, res) {
    var UserID = req.body.UserID;
    var PayDate = req.body.PayDate;
    var PayType = req.body.PayType;
    if (UserID && PayDate && PayType) {
        var payment = new SmartPayPayment(UserID, null, null, null, null, null);
        // 取得付款授權
        payment.payByOtherWay(payment.UserID, PayDate, PayType).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "客服協助設定付費狀態未成功，原因：" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入正確參數，客服協助設定付費狀態未成功" });
    }
}