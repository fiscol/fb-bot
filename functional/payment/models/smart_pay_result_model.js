var db = require('../../../db/firebase_db.js');
var crypto = require('crypto');
var aes = require('aes-js');
var config = require('../../../config/smart_pay_config.js');
var errorLog = require('../../../tool/ErrorLog.js');
var Pay2Go = require('./pay2go_model.js');
var formidable = require('formidable');

var SmartPayResult = function (UserID, Product) {
    this.UserID = UserID;
    this.Product = Product;
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    };
    this.processOnceTrade = function (TradeResult) {
        if (JSON.parse(TradeResult).Status == "SUCCESS") {
            // TradeData是智付通回傳的交易紀錄
            var TradeData = JSON.parse(JSON.parse(TradeResult).Result);
            // 取得付款資訊
            return db._onValuePromise("EilisUser", UserID).then(function (_DBUserData) {
                var DBTradeData = _DBUserData["TradeInfo"];
                // 儲值性未結帳商品加入已付帳單記錄
                if (!DBTradeData.hasOwnProperty("OncePayRecords")) {
                    DBTradeData["OncePayRecords"] = {};
                }
                var PayDate = _dateToDBString(new Date(), "Date").replaceAll('/', '-');
                if (!DBTradeData["OncePayRecords"].hasOwnProperty(PayDate)) {
                    DBTradeData["OncePayRecords"][PayDate] = {};
                }
                var MerchantOrderNo = TradeData.MerchantOrderNo;
                DBTradeData["OncePayRecords"][PayDate][MerchantOrderNo] = {};
                DBTradeData["OncePayRecords"][PayDate][MerchantOrderNo] = TradeData;
                DBTradeData["OncePayRecords"][PayDate][MerchantOrderNo]["ProductType"] = Product;

                // 更新加值廣播則數
                var RefPath = "EilisData/ProductSpec";
                var ChildName = Product;
                return db._onValuePromise(RefPath, ChildName).then(function (_SpecData) {
                    var DBProductData = _DBUserData["ProductInfo"];
                    if (_SpecData != null) {
                        DBTradeData["OncePayRecords"][PayDate][MerchantOrderNo]["ProductDetail"] = _SpecData["Detail"];
                        if (Product == "ECABroadcast" || Product == "ECBBroadcast" || Product == "ECCBroadcast" || Product == "ECHighBroadcast") {
                            var BroadcastAmount = _SpecData["EilisBroadcast"];
                            var MonthlyQuota = DBProductData["ProductFunction"]["EilisBroadcastLimit"];
                            var BonusQuota = DBProductData["ProductFunction"]["EilisBonusLimit"] || 0;
                            // 若當月廣播則數為負，先嘗試補充當月廣播數到0，再補充加值廣播則數
                            if (MonthlyQuota < 0) {
                                DBProductData["ProductFunction"]["EilisBroadcastLimit"] = (MonthlyQuota + BroadcastAmount < 0) ? MonthlyQuota + BroadcastAmount : 0;
                                DBProductData["ProductFunction"]["EilisBonusLimit"] = (MonthlyQuota + BroadcastAmount < 0) ? BonusQuota : BonusQuota + (BroadcastAmount + MonthlyQuota);
                            }
                            // 補充加值廣播則數
                            else {
                                DBProductData["ProductFunction"]["EilisBonusLimit"] = BonusQuota + BroadcastAmount;
                            }
                        }
                    }
                    var UpdateData = {
                        "TradeInfo": DBTradeData,
                        "ProductInfo": DBProductData
                    }
                    // 更新資料庫
                    return db._update("EilisUser", UserID, UpdateData).then(function () {
                        return Promise.resolve("第三方支付成功, 已更新資料庫付款紀錄");
                    }).catch(function (err) {
                        errorLog._ErrorLogToDB(err.stack || err);
                        return Promise.reject("第三方支付成功, 更新資料庫失敗, 更新付款資訊發生錯誤, 原因:" + err);
                    })
                }).catch(function (err) {
                    errorLog._ErrorLogToDB(err.stack || err);
                    return Promise.reject("第三方支付成功, 更新資料庫失敗, 取得商品詳細資訊發生錯誤, 原因:" + err);
                })
            }).catch(function (err) {
                return Promise.reject("第三方支付成功, 更新資料庫失敗, 取得付款資訊發生錯誤, 原因:" + err);
            })
        }
        else {
            return Promise.reject("第三方支付出現錯誤, 付款失敗");
        }
        //成功回傳格式
        // { 
        //     "Status":"SUCCESS",
        //     "Message":"\u6388\u6b0a\u6210\u529f",
        //     "Result":"{
        //         \"MerchantID\":\"MS31568447\",
        //         \"Amt\":699,
        //         \"TradeNo\":\"17050916545223932\",
        //         \"MerchantOrderNo\":\"g7pjRBNA\",
        //         \"RespondType\":\"JSON\",\"CheckCode\":\"B5CBB916FA05542482FE4CD67BC07C09631B011BE2F0D5F78198C7CCFE5D768D\",\"IP\":\"122.118.6.208\",
        //         \"EscrowBank\":\"KGI\",
        //         \"PaymentType\":\"CREDIT\",
        //         \"PayTime\":\"2017-05-09 16:54:52\",
        //         \"RespondCode\":\"00\",
        //         \"Auth\":\"930637\",
        //         \"Card6No\":\"400022\",
        //         \"Card4No\":\"1111\",
        //         \"Exp\":\"2002\",
        //         \"TokenUseStatus\":0,
        //         \"InstFirst\":699,
        //         \"InstEach\":0,
        //         \"Inst\":0,
        //         \"ECI\":\"\"
        //     }" 
        // }
    }
    this.processPeriodAuth = function (PeriodText) {
        var cbc = new aes.ModeOfOperation.cbc(new Buffer(config.PeriodStoreHashKey), new Buffer(config.PeriodStoreHashIV));
        var PeriodData = JSON.stringify(aes.utils.utf8.fromBytes(aes.padding.pkcs7.pad(cbc.decrypt(aes.utils.hex.toBytes(PeriodText)))));
        PeriodData = JSON.parse(PeriodData.replace(/\\/g, "").substring(1, PeriodData.replace(/\\/g, "").lastIndexOf('}') + 1));

        // 儲存授權資料
        if (PeriodData.Status == "SUCCESS") {
            var PayDateArray = PeriodData.Result.DateArray.split(',');
            var FirstPayDate = PayDateArray[0];
            var NextPayDate = PayDateArray[1];
            var NextInformDate = _dateToDBString(_addYear(new Date(FirstPayDate), 1), "Date").replaceAll('/', '-');
            // 更新提醒時間, 下次授權時間, 加入授權資料
            var AuthData = {
                "NextPayDate": NextPayDate,
                "NextInformDate": NextInformDate,
                "AuthDetail": PeriodData.Result,
            }
            // 取得已加入服務的專頁清單
            return db._onValuePromise("EilisUser/" + UserID + "/TradeInfo", "PurchasedService").then(function (_ServiceData) {
                if (!_ServiceData.hasOwnProperty("AuthData")) {
                    _ServiceData["AuthData"] = [];
                }
                _ServiceData["AuthData"].push(AuthData);
                _ServiceData["PayStatus"] = "Paid";

                // 更新資料庫
                return db._set("EilisUser/" + UserID + "/TradeInfo", "PurchasedService", _ServiceData).then(function () {
                    var RefPath = "EilisUser/" + UserID;
                    var ChildName = "UserBasicData";

                    return db._onValuePromise(RefPath, ChildName).then(function (_UserBasicData) {
                        var AllPageData = _UserBasicData["AllPageData"];
                        for (var i = 0; i < AllPageData["data"].length; i++) {
                            if (AllPageData["data"][i]["status"] == "Started, Not Paid Page") {
                                _UserBasicData["AllPageData"]["data"][i]["status"] = "Started, Already Paid Page";
                            }
                            else if (AllPageData["data"][i]["status"] == "Suspended, Not Paid Page") {
                                _UserBasicData["AllPageData"]["data"][i]["status"] = "Suspended, Already Paid Page";
                            }
                        }
                        _UserBasicData["BonusDays"] = 0;
                        return db._update(RefPath, ChildName, _UserBasicData).then(function () {
                            return Promise.resolve("第三方授權支付成功, 已更新資料庫授權紀錄");
                        }).catch(function (err) {
                            return Promise.reject("第三方授權支付成功, 更新專頁資料狀態失敗, 原因:" + err);
                        })
                    }).catch(function (err) {
                        return Promise.reject("第三方授權支付成功, 取得專頁資料失敗, 原因:" + err);
                    })
                }).catch(function (err) {
                    return Promise.reject("第三方授權支付成功, 更新資料庫失敗, 原因:" + err);
                })
            }).catch(function (err) {
                return Promise.reject("第三方授權支付成功, 更新資料庫失敗, 取得付款資訊發生錯誤, 原因:" + err);
            })
        }
        else {
            return Promise.reject("第三方授權支付出現錯誤, 付款失敗");
        }

        //成功回傳格式 
        // {
        //     "Status":"SUCCESS", 
        //     "Message":"\u59d4\u8a17\u55ae\u6210\u7acb\uff0c\u4e14\u9996\u6b21\u6388\u6b0a\u6210\u529f", 
        //     "Result":{ 
        //         "MerchantID":"MS31568447", 
        //         "MerchantOrderNo":"Z2pxc2KY", 
        //         "PeriodType":"M", 
        //         "PeriodAmt":"699", 
        //         "AuthTimes":12, 
        //         "DateArray":"2017-06-01,2017-07-01,2017-08-01,2017-09-01,2017-10-01,2017-11-01,2017-12-01,2018-01-01,2018-02-01,2018-03-01,2018-04-01,2018-05-01",
        //         "TradeNo":"17050916315341826",
        //         "AuthCode":"930637",
        //         "RespondCode":"00",
        //         "AuthTime":"20170509163153",
        //         "CardNo":"400022******1111",
        //         "EscrowBank":"KGI",
        //         "AuthBank":"KGI",
        //         "PeriodNo":"P170509163152HiOkX8" 
        //     }
        // }
    }
    this.processPeriodPay = function (ReqData) {
        return new Promise(function (resolve, reject) {
            var form = new formidable.IncomingForm();
            form.encoding = 'utf-8';
            form.multiples = false;

            form.parse(ReqData, function (err, fields) {
                if (fields.hasOwnProperty("Period")) {
                    var cbc = new aes.ModeOfOperation.cbc(new Buffer(config.PeriodStoreHashKey), new Buffer(config.PeriodStoreHashIV));
                    var PayData = aes.utils.utf8.fromBytes(cbc.decrypt(aes.utils.hex.toBytes(fields.Period)));
                    PayData = JSON.parse(PayData.substring(0, PayData.lastIndexOf('}') + 1));
                    console.log("PayNotifyData:" + PayData);
                    if (PayData.Status == "SUCCESS") {
                        var PayDate = _dateToDBString(new Date(), "Date").replaceAll('/', '-');
                        // 更新付款歷史紀錄
                        db._update("EilisUser/" + UserID + "/TradeInfo/PeriodPayRecords", PayDate, PayData.Result).then(function () {
                            // 開立發票(暫時用人工開)
                            // var pay2Go = new Pay2Go(UserID);
                            // var MerchantOrderNo = PayData.Result.MerchantOrderNo;
                            // var Amt = PayData.Result.AuthAmt;
                            // pay2Go.setReceipt(MerchantOrderNo, Amt).then(function (_ReceiptData) {
                            // 取得目前剩餘的廣播Quota
                            db._onValuePromise("EilisUser/" + UserID, "ProductInfo").then(function (_ProductData) {
                                var ServiceLevel = _ProductData["ProductLevel"];
                                var BroadcastLeft = _ProductData["ProductFunction"]["EilisBroadcastLimit"];
                                db._onValuePromise("EilisData/ProductSpec/" + ServiceLevel, "EilisBroadcast").then(function (_MonthlyQuota) {
                                    // 若剩餘廣播則數數量大於原服務spec, 不更新functional spec; 反之則重置本月functional spec
                                    if (_MonthlyQuota > BroadcastLeft) {
                                        var ProductFunctionData = Object.assign({}, _ProductData["ProductFunction"]);
                                        ProductFunctionData["EilisBroadcastLimit"] = (BroadcastLeft >= 0) ? _MonthlyQuota : BroadcastLeft + _MonthlyQuota;
                                        db._update("EilisUser/" + UserID + "/ProductInfo", "ProductFunction", ProductFunctionData).then(function (_Result) {
                                            // 更新下次付款日
                                            if (PayData.Result.hasOwnProperty("NextAuthDate")) {
                                                db._onValuePromise("EilisUser/" + UserID + "/TradeInfo", "PurchasedService").then(function (_ServiceData) {
                                                    if (_ServiceData["AuthData"][_ServiceData["AuthData"].length - 1]["AuthDetail"].hasOwnProperty("DateArray")) {
                                                        var DateArray = _ServiceData["AuthData"][_ServiceData["AuthData"].length - 1]["AuthDetail"]["DateArray"];
                                                        var PeriodNow = DateArray.indexOf(PayData.Result.NextAuthDate);
                                                        if (PeriodNow != -1 && PeriodNow != DateArray.length - 1) {
                                                            _ServiceData["AuthData"][_ServiceData["AuthData"].length - 1]["NextPayDate"] = DateArray[(PeriodNow + 1)];
                                                        }
                                                        else if (PeriodNow == DateArray.length - 1) {
                                                            _ServiceData["AuthData"][_ServiceData["AuthData"].length - 1]["NextPayDate"] = "None";
                                                        }
                                                    }
                                                    db._update("EilisUser/" + UserID + "/TradeInfo", "PurchasedService", _ServiceData).then(function () {
                                                        return resolve("本月付費成功!");
                                                    }).catch(function (err) {
                                                        return reject("第三方支付成功, 但更新下次付款日期失敗, 原因:" + err);
                                                    })
                                                }).catch(function (err) {
                                                    return reject("第三方支付成功, 但更新下次付款日期失敗, 原因:" + err);
                                                })
                                            }
                                            else {
                                                return resolve("本月付費成功!");
                                            }
                                        }).catch(function (err) {
                                            return reject("第三方支付成功, 但更新廣播配額失敗, 原因:" + err);
                                        })
                                    }
                                    else {
                                        return resolve("本月付費成功!");
                                    }
                                }).catch(function (err) {
                                    return reject("第三方支付成功, 但取得方案內容失敗, 原因:" + err);
                                })
                            }).catch(function (err) {
                                return reject("第三方支付成功, 但取得專頁設定失敗, 原因:" + err);
                            })
                            // }).catch(function (err) {
                            //     return reject("第三方支付成功, 但設定開立發票未成功，原因：" + err);
                            // });
                        }).catch(function (err) {
                            return reject("第三方支付成功, 但更新付款記錄失敗, 原因:" + err);
                        })
                    }
                    else {
                        return reject("第三方支付扣款出現錯誤, 付款失敗, 原因:" + PayData.Message);
                    }
                }
                else {
                    return reject("第三方支付出現錯誤, 付款失敗");
                }
            });
        })
    }
}

function _addYear(date, years) {
    var result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
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

module.exports = SmartPayResult;