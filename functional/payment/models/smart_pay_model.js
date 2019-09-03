var db = require('../../../db/firebase_db.js');
var crypto = require('crypto');
var aes = require('aes-js');
var config = require('../../../config/smart_pay_config.js');

var SmartPayPayment = function (userID, pageID, email, smartToken, bonusDays, product) {
    this.UserID = userID;
    this.PageID = pageID;
    this.Email = email;
    this.SmartToken = smartToken;
    this.BonusDays = bonusDays;
    this.Product = product;
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    };
    // 信用卡一次付清單筆帳單
    this.payBySmartPay = function (PayAmount, ProductDetail) {
        // 信用卡一次付清的官方說明API文件:
        // https://www.spgateway.com/dw_files/info_api/spgateway_gateway_MPGapi_V1_0_3.pdf
        // GitHub範例:
        // https://github.com/onlinemad/node-spgateway/blob/master/lib/spgateway.js
        var payDetail = {
            "MerchantID": config.OnceStoreMerchantID,
            "RespondType": "JSON",
            "CheckValue": "",
            "TimeStamp": Date.now(),
            // Eilis系統自定義的識別ID
            "MerchantOrderNo": _genOrderID(),
            // 本次付款金額
            "Amt": PayAmount,
            // ItemDesc為完整帳單
            "ItemDesc": ProductDetail,
            "Email": this.Email,
            "LoginType": 0,
            "Version": "1.2",
            "ReturnURL": config.OncePayRedirectUri + '?UserID=' + this.UserID + '&Product=' + this.Product
            // "TokenTerm": this.SmartToken
        };
        payDetail.CheckValue = _GetCheckValue(config.OnceStoreHashKey, config.OnceStoreHashIV, payDetail.Amt, payDetail.MerchantID, payDetail.MerchantOrderNo, payDetail.TimeStamp, payDetail.Version);
        payDetail.SubmitURL = config.OncePaySubmitUri;
        return Promise.resolve(payDetail);
    }
    // 設定定期定額授權交易
    this.payBySmartPayPeriod = function (PayAmount, ProductDetail) {
        // 定期定額相關參數的官方說明API文件:
        // https://www.spgateway.com/dw_files/info_api/spgateway_gateway_periodical_api_V1_0_6.pdf
        // GitHub範例:
        // https://github.com/onlinemad/node-spgateway/blob/master/lib/spgateway.js
        var MerchantID = config.PeriodStoreMerchantID;
        var payDetail = {
            // Eilis系統自定義的識別ID
            "MerOrderNo": _genOrderID(),
            "OrderInfo": "N",
            "PayerEmail": this.Email,
            "PayMentInfo": "Y",
            // 本次付款金額
            "PeriodAmt": PayAmount,
            // 週期授權時間為註冊當天日期, 
            // 特殊狀況:若為29, 30, 31則以隔月1號為付款日
            "PeriodPoint": _genPeriodDay(this.UserID).PeriodPoint,
            "PeriodStartType": _genPeriodDay(this.UserID).PeriodStartType,
            "PeriodTimes": _genPeriodDay(this.UserID).PeriodTimes,
            // 週期為"每月"
            "PeriodType": "M",
            // ProdDesc為完整帳單
            "ProdDesc": ProductDetail,
            "RespondType": "JSON",
            "TimeStamp": Date.now(),
            "Version": "1.0",
            // 授權成功後的呼叫
            "ReturnURL": config.PeriodPayRedirectUri + '/' + this.UserID,
            // 每次授權付款成功後的呼叫
            "NotifyURL": config.PeriodPayNotifyUri + '/' + this.UserID
        };
        var payload = "MerOrderNo=" + payDetail.MerOrderNo + "&NotifyURL=" + payDetail.NotifyURL + "&OrderInfo=" + payDetail.OrderInfo + "&PayerEmail=" + payDetail.PayerEmail + "&PaymentInfo=" + payDetail.PayMentInfo + "&PeriodAmt=" + payDetail.PeriodAmt + "&PeriodPoint=" + payDetail.PeriodPoint + "&PeriodStartType=" + payDetail.PeriodStartType + "&PeriodTimes=" + payDetail.PeriodTimes + "&PeriodType=" + payDetail.PeriodType + "&ProdDesc=" + payDetail.ProdDesc + "&RespondType=" + payDetail.RespondType + "&ReturnURL=" + payDetail.ReturnURL + "&TimeStamp=" + payDetail.TimeStamp + "&Version=" + payDetail.Version;
        var PostData = _GetEncryptedPostData(config.PeriodStoreHashKey, config.PeriodStoreHashIV, payload);
        var cbc = new aes.ModeOfOperation.cbc(new Buffer(config.PeriodStoreHashKey), new Buffer(config.PeriodStoreHashIV));
        console.log(aes.utils.utf8.fromBytes(cbc.decrypt(aes.utils.hex.toBytes(PostData))));
        return Promise.resolve({
            "MerchantID": MerchantID,
            "PostData": PostData,
            "SubmitURL": config.PeriodPaySubmitUri
        });
    }
    // 取消授權已成立的交易
    this.cancelWithSmartPay = function (PayAmount, TradeID) {
        // 取消授權相關參數的官方說明API文件:
        // https://www.spgateway.com/dw_files/info_api/gateway_creditcard_deauthorize_api_V1_0_0.pdf
        var MerchantID = config.PeriodStoreMerchantID;
        var payDetail = {
            // 本次付款金額
            "Amt": PayAmount,
            "IndexType": 1,
            // Eilis系統自定義的識別ID
            "MerchantOrderNo": TradeID,
            "RespondType": "JSON",
            "TimeStamp": Date.now(),
            "Version": "1.0",
        };
        var payload = "Amt=" + payDetail.Amt + "&IndexType=" + payDetail.IndexType + "&MerchantOrderNo=" + payDetail.MerchantOrderNo + "&RespondType=" + payDetail.RespondType + "&TimeStamp=" + payDetail.TimeStamp + "&Version=" + payDetail.Version;
        var PostData = _GetEncryptedPostData(config.PeriodStoreHashKey, config.PeriodStoreHashIV, payload);
        return Promise.resolve({
            "MerchantID": MerchantID,
            "PostData": PostData,
            "SubmitURL": config.CancelPaySubmitUri
        });
    }
    // 產製智付通記憶卡號Token
    this.genSmartToken = function () {
        return _randomAsciiString(10);
    }
}

// 取得定期定額商品付款總額, 完整購買服務內容
SmartPayPayment.prototype.getPeriodPayDetail = function (UserID) {
    var Ref = "EilisUser/" + UserID + "/TradeInfo";
    var Childname = "PurchasedService";
    return db._onValuePromise(Ref, Childname).then(function (_PurchasedData) {
        if (_PurchasedData != null) {
            return Promise.resolve(_PurchasedData);
        }
        else {
            return Promise.reject('沒有找到專頁的購買資訊');
        }
    }).catch(function (err) {
        return Promise.reject("搜尋使用者本週期款項發生錯誤, 原因:" + err);
    })
}

// 取得單次付費歷史交易紀錄
SmartPayPayment.prototype.getOncePayHistory = function (UserID) {
    var Ref = "EilisUser/" + UserID + "/TradeInfo";
    var Childname = "OncePayRecords";
    return db._onValuePromise(Ref, Childname).then(function (_OncePayRecords) {
        if (_OncePayRecords != null) {
            var OncePayHistory = {};
            for (var i = 0; i < Object.keys(_OncePayRecords).length; i++) {
                var PayDate = Object.keys(_OncePayRecords)[i];
                OncePayHistory[PayDate] = {};
                for (var j = 0; j < Object.keys(_OncePayRecords[PayDate]).length; j++) {
                    var MerchantOrderNo = Object.keys(_OncePayRecords[PayDate])[j];
                    OncePayHistory[PayDate]["Trade" + (j + 1)] = {};
                    OncePayHistory[PayDate]["Trade" + (j + 1)] = {
                        // Eilis的交易序號
                        "TradeID": MerchantOrderNo,
                        // 該期的總付款金額
                        "Price": _OncePayRecords[PayDate][MerchantOrderNo]["Amt"],
                        // 付款時間
                        "PayTime": _OncePayRecords[PayDate][MerchantOrderNo]["PayTime"],
                        // 購買內容
                        "Detail": _OncePayRecords[PayDate][MerchantOrderNo]["ProductDetail"]
                    }
                }
            }
            return Promise.resolve(OncePayHistory);
        }
        else {
            return Promise.reject("找不到該使用者的單次付費紀錄");
        }
    }).catch(function (err) {
        return Promise.reject("搜尋使用者單次付費歷史交易發生錯誤, 原因:" + err);
    })
}

// 取得專頁付款授權
SmartPayPayment.prototype.getPeriodPayAuth = function (UserID) {
    var Ref = "EilisUser/" + UserID + "/TradeInfo";
    var Childname = "PurchasedService";
    return db._onValuePromise(Ref, Childname).then(function (_PurchasedData) {
        if (_PurchasedData != null && _PurchasedData.hasOwnProperty("AuthData")) {
            var ReturnAuthData = {
                "Detail": _PurchasedData["Detail"],
                "Price": _PurchasedData["Price"],
                "NextInformDate": _PurchasedData["AuthData"][_PurchasedData["AuthData"].length - 1]["NextInformDate"],
                "NextPayDate": _PurchasedData["AuthData"][_PurchasedData["AuthData"].length - 1]["NextPayDate"],
                "PeriodTotal": _PurchasedData["AuthData"][_PurchasedData["AuthData"].length - 1]["AuthDetail"]["AuthTimes"],
                "AuthTime": _SetDateTimeFormat(_PurchasedData["AuthData"][_PurchasedData["AuthData"].length - 1]["AuthDetail"]["AuthTime"])
            }
            return Promise.resolve(ReturnAuthData);
        }
        else {
            return Promise.reject('找不到專頁的授權資訊');
        }
    }).catch(function (err) {
        return Promise.reject('搜尋專頁的授權資訊發生錯誤, 原因:' + err);
    })
}

// 手動由客服協助設定付費狀態(匯款等方式)
SmartPayPayment.prototype.payByOtherWay = function (UserID, PayDate, PayType) {
    return db._onValuePromise("EilisUser", UserID).then(function (_UserData) {
        // 通知付費過期日期
        var InformDate = new Date(PayDate);
        // 更新加值廣播則數
        var DBProductData = _UserData["ProductInfo"];
        var ProductType = DBProductData["ProductLevel"];
        var BroadcastAmount = 0;
        // 總加值廣播期數
        var Period = 1;
        if (PayType == "Month") {
            InformDate = _dateToDBString(_addMonth(InformDate, 1), "Date").replaceAll('/', '-');
            // 商務版月付30000則，秘書版月付10000則，小助理版月付5000則
            BroadcastAmount = (ProductType == "ECHigh") ? 30000 * Period : (ProductType == "ECC") ? 10000 * Period : (ProductType == "ECA") ? 5000 : 0;
        }
        else if (PayType == "Half Year") {
            InformDate = _dateToDBString(_addMonth(InformDate, 6), "Date").replaceAll('/', '-');
            Period = 6;
            // 商務版半年付30000 * 12則，秘書版半年付10000 * 12則，小助理版半年付5000 * 12則
            BroadcastAmount = (ProductType == "ECHigh") ? 30000 * Period : (ProductType == "ECC") ? 10000 * Period : (ProductType == "ECA") ? 5000 : 0;
        }
        else if (PayType == "Year") {
            InformDate = _dateToDBString(_addYear(InformDate, 1), "Date").replaceAll('/', '-');
            Period = 12;
            // 商務版年付50000 * 12則，秘書版年付15000 * 12則
            BroadcastAmount = (ProductType == "ECHigh") ? 50000 * Period : (ProductType == "ECC") ? 15000 * Period : 0;
        }
        else {
            return Promise.reject('更新用戶付費資料發生錯誤, 原因:PayType格式不正確');
        }
        var MonthlyQuota = DBProductData["ProductFunction"]["EilisBroadcastLimit"];
        var BonusQuota = DBProductData["ProductFunction"]["EilisBonusLimit"] || 0;
        // 若當月廣播則數為負，先嘗試補充當月廣播數到0，再補充加值廣播則數
        if (MonthlyQuota < 0) {
            _UserData["ProductInfo"]["ProductFunction"]["EilisBroadcastLimit"] = (MonthlyQuota + BroadcastAmount < 0) ? MonthlyQuota + BroadcastAmount : 0;
            _UserData["ProductInfo"]["ProductFunction"]["EilisBonusLimit"] = (MonthlyQuota + BroadcastAmount < 0) ? BonusQuota : BonusQuota + (BroadcastAmount + MonthlyQuota);
        }
        // 補充加值廣播則數
        else {
            _UserData["ProductInfo"]["ProductFunction"]["EilisBonusLimit"] = BonusQuota + BroadcastAmount;
        }
        //加入付費授權日期資訊
        var AuthData = {
            "NextInformDate": InformDate,
            "NextPayDate": "None",
            "AuthDetail": {
                "AuthTimes": 1,
                "AuthTime": _dateToDBString(new Date(PayDate), "DateTime").replaceAll('/', '').replaceAll(':', '').replaceAll(' ', '')
            }
        }
        if (!_UserData["TradeInfo"]["PurchasedService"].hasOwnProperty("AuthData")) {
            _UserData["TradeInfo"]["PurchasedService"]["AuthData"] = [];
        }
        _UserData["TradeInfo"]["PurchasedService"]["AuthData"].push(AuthData);
        //變更用戶付費狀態為已付費
        _UserData["TradeInfo"]["PurchasedService"]["PayStatus"] = "Paid";
        _UserData["UserBasicData"]["BonusDays"] = 0;
        //變更所有管理粉專付費狀態為已付費
        var AllPage = _UserData["UserBasicData"]["AllPageData"]["data"];
        for (var i = 0; i < AllPage.length; i++) {
            if (AllPage[i]["status"] == "Started, Not Paid Page") {
                _UserData["UserBasicData"]["AllPageData"]["data"][i]["status"] = "Started, Already Paid Page";
            }
            else if (AllPage[i]["status"] == "Suspended, Not Paid Page") {
                _UserData["UserBasicData"]["AllPageData"]["data"][i]["status"] = "Suspended, Already Paid Page";
            }
        }
        return db._update("EilisUser", UserID, _UserData).then(function () {
            return Promise.resolve({ "Message": "設定付費狀態成功" });
        }).catch(function (err) {
            return Promise.reject('更新用戶付費資料發生錯誤, 原因:' + err);
        })
    }).catch(function (err) {
        return Promise.reject('搜尋用戶資訊發生錯誤, 原因:' + err);
    })
}

// 產製CheckValue
var _GetCheckValue = function (HashKey, HashIV, Amt, MerchantID, MerchantOrderNo, TimeStamp, Version) {
    var CheckValueDecrypted = "HashKey=" + HashKey + "&Amt=" + Amt + "&MerchantID=" + MerchantID + "&MerchantOrderNo=" + MerchantOrderNo + "&TimeStamp=" + TimeStamp + "&Version=" + Version + "&HashIV=" + HashIV;
    var CheckValueEncrypted = crypto.createHash('sha256').update(CheckValueDecrypted).digest('hex').toUpperCase();
    return CheckValueEncrypted;
}

// 產製PostData(AES加密)
// GitHub範例:
// https://github.com/ricmoo/aes-js/issues/27
var _GetEncryptedPostData = function (HashKey, HashIV, Payload) {
    var cbc = new aes.ModeOfOperation.cbc(new Buffer(HashKey), new Buffer(HashIV));
    var EncryptedPostData = aes.utils.hex.fromBytes(cbc.encrypt(aes.padding.pkcs7.pad(aes.utils.utf8.toBytes(Payload))));
    return EncryptedPostData;
}

// 取得本日日期, 回傳做為每月的授權付款日
var _genPeriodDay = function (userID) {
    var today = new Date();
    var dayOfMonth = today.getDate();
    // periodStartType = 2 時，代表當日立即支付一筆"總授權期數之外"的付款，所以總授權期數等於periodTimes + 1
    var periodStartType = 2;
    // 總授權期數
    var periodTimes = 12;
    // 智付通以Varchar格式設定付款日, 個位數前面要補零
    if (dayOfMonth < 10) {
        dayOfMonth = "0" + dayOfMonth.toString();
    }
    // 特殊狀況: 若為29, 30, 31則以隔月1號為付款日
    else if (dayOfMonth > 28) {
        dayOfMonth = "01";
        // periodStartType = 1 時，代表在下個月的PeriodPoint(dayOfMonth)支付第一筆付款，所以總授權期數等於periodTimes
        periodStartType = 1;
    }
    // 玉如阿姨特殊Case, 補一筆2018/2/1為第一天支付, 授權為11期的訂單
    var YuruSpecialCase = (userID == "1675231689156393" && new Date() < new Date("2018-02-02")) ? true : false;
    if (YuruSpecialCase == true) {
        //若為2月1號啟用授權，則為當天授權扣款
        periodStartType = (new Date().getMonth() == 1 && new Date().getDate() == 1) ? 2 : 1;
        dayOfMonth = "01";
        periodTimes = 11;
    }
    return {
        "PeriodPoint": dayOfMonth.toString(),
        "PeriodStartType": periodStartType,
        "PeriodTimes": periodTimes,
    };
}

function _addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// 產製Eilis的交易隨機碼
var _genOrderID = function () {
    return _randomAsciiString(8);
}

var _randomString = function (length, chars) {
    if (!chars) {
        throw new Error('Argument \'chars\' is undefined');
    }

    var charsLength = chars.length;
    if (charsLength > 256) {
        throw new Error('Argument \'chars\' should not have more than 256 characters'
            + ', otherwise unpredictability will be broken');
    }

    var randomBytes = crypto.randomBytes(length);
    var result = new Array(length);

    var cursor = 0;
    for (var i = 0; i < length; i++) {
        cursor += randomBytes[i];
        result[i] = chars[cursor % charsLength];
    }

    return result.join('');
}

var _randomAsciiString = function (length) {
    return _randomString(length,
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
}

var _SetDateTimeFormat = function (input) {
    var DateStr = input.substring(0, 4) + '/' + input.substring(4, 6) + '/' + input.substring(6, 8) + ' ' + input.substring(8, 10) + ':' + input.substring(10, 12) + ':' + input.substring(12, 14);
    return DateStr;
}

function _addYear(date, years) {
    var result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

function _addMonth(date, months) {
    var result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

//日期格式轉DB日期字串(_DateType可傳入"DateTime"或"Date")
var _dateToDBString = function (_Input, _DateType) {
    // Time Log Test
    var dd = _Input.getDate();
    var mm = _Input.getMonth() + 1; //January is 0!
    var yyyy = _Input.getFullYear();
    var h = _Input.getHours();
    var m = _Input.getMinutes();
    var s = _Input.getSeconds();
    if (dd < 10) {
        dd = '0' + dd
    }

    if (mm < 10) {
        mm = '0' + mm
    }

    if (h < 10) {
        h = '0' + h
    }
    if (m < 10) {
        m = '0' + m
    }
    if (s < 10) {
        s = '0' + s
    }
    var DateString;
    if (_DateType == "DateTime") {
        DateString = yyyy + '/' + mm + '/' + dd + " " + h + ":" + m + ":" + s;
    }
    if (_DateType == "Date") {
        DateString = yyyy + '/' + mm + '/' + dd;
    }
    return DateString;
}

module.exports = SmartPayPayment;