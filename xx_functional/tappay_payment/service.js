//Models
var PrimeKeyPayment = require('./models/prime_key_model.js');
var CardTokenPayment = require('./models/card_token_model.js');
var Refund = require('./models/refund_model.js');
var TradeRecord = require('./models/trade_record_model.js');

var db = require('../../db/firebase_db.js');

//Tappay後端API參考文件：
//https://docs.tappaysdk.com/tutorial/zh/back.html#pay-by-prime-api

//tappay退款功能
exports._Refund = function (req, res) {
    var RecTradeID = req.body.RecTradeID;
    if (RecTradeID) {
        var refund = new Refund(req.body.RecTradeID, req.body.Amount);
        if (refund.refundDetail.rectradeid != null) {
            refund.refundWithAmount(refund.refundDetail).then(function (_Result) {
                if (_Result.status != 0) {
                    res.json({ "Error": "傳送至第三方支付商發生錯誤，退款作業未成功，原因：" + _Result.msg });
                }
                else {
                    res.json(_Result);
                }
            }).catch(function (err) {
                res.json({ "Error": "傳送至第三方支付商發生錯誤，退款作業未成功，原因：" + err });
            });
        }
        else {
            res.json({ "Error": "設定退款功能出現錯誤，退款作業未成功" });
        }
    }
    else {
        res.json({ "Error": "未傳入正確參數，退款作業未成功" });
    }
}

//tappay查詢交易紀錄
exports._GetTradeRecord = function (req, res) {
    var tradeRecord = new TradeRecord();
    tradeRecord.getTradeRecord(tradeRecord.queryDetail).then(function (_Result) {
        if (_Result.status != 0) {
            res.json({ "Error": "取得歷史交易紀錄未成功，原因：" + _Result.msg });
        }
        else {
            res.json(_Result);
        }
    }).catch(function (err) {
        res.json({ "Error": "取得歷史交易紀錄未成功，原因：" + err });
    });
}

//tappay付款功能
exports._PayWithTappay = function (req, res) {
    //把PrimeKey改由DB查詢
    var UserID = req.body.UserID;
    if (UserID) {
        //查詢資料庫, 決定用PrimeKey或CardToken交易
        db._onValuePromise("EilisUser/" + UserID + "/UserBasicData", "CardKeys").then(function (_CardData) {
            // 用Tappay提供的永久性代碼交易
            if (_CardData.CardKey && _CardData.CardToken) {
                var CardKey = _CardData.CardKey;
                var CardToken = _CardData.CardToken;
                var PhoneNumber = _CardData.PhoneNumber;
                var Name = _CardData.Name;
                var Email = _CardData.Email;
                var payment = new CardTokenPayment(CardKey, CardToken, UserID, PhoneNumber, Name, Email);
                // 取得付款總額, 完整購買服務清單
                payment.getPayDetail(payment.UserID).then(function (_PayDetail) {
                    if (_PayDetail.Price && _PayDetail.TradeList) {
                        payment.payByCardToken(_PayDetail.Price, _PayDetail.TradeList).then(function (_Result) {
                            res.json(_Result);
                        }).catch(function (err) {
                            res.json({ "Error": "傳送至第三方支付商發生錯誤，繳費作業未成功，原因：" + err });
                        });
                    }
                    else {
                        res.json({ "Error": "設定付款功能出現錯誤，繳費作業未成功" });
                    }
                }).catch(function (err) {
                    res.json({ "Error": "取得付款總額出現錯誤，繳費作業未成功，原因：" + err });
                });
            }
            // 用Tappay提供的初次代碼交易
            else if (_CardData.PrimeKey) {
                var PrimeKey = _CardData.PrimeKey;
                var PhoneNumber = _CardData.PhoneNumber;
                var Name = _CardData.Name;
                var Email = _CardData.Email;
                var payment = new PrimeKeyPayment(PrimeKey, UserID, PhoneNumber, Name, Email);
                // 取得付款總額, 完整購買服務清單
                payment.getPayDetail(payment.UserID).then(function (_PayDetail) {
                    if (_PayDetail.Price && _PayDetail.TradeList) {
                        payment.payByPrime(_PayDetail.Price, _PayDetail.TradeList).then(function (_Result) {
                            res.json(_Result);
                        }).catch(function (err) {
                            res.json({ "Error": "傳送至第三方支付商發生錯誤，繳費作業未成功，原因：" + err });
                        });
                    }
                    else {
                        res.json({ "Error": "設定付款功能出現錯誤，繳費作業未成功" });
                    }
                }).catch(function (err) {
                    res.json({ "Error": "取得付款總額出現錯誤，繳費作業未成功，原因：" + err });
                });
            }
            else {
                res.json({ "Error": "使用者尚未加入信用卡綁定到Eilis服務" });
            }
        }).catch(function (err) {
            res.json({ "Error": "使用者尚未加入信用卡綁定到Eilis服務" });
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數，繳費作業未成功" });
    }
}