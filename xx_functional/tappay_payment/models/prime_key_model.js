var db = require('../../../db/firebase_db.js');
var request = require('request');
var requestPromise = require('request-promise');
var crypto = require('crypto');

var PrimeKeyPayment = function (primeKey, userID, phoneNumber, name, email) {
    this.UserID = userID;
    this.PhoneNumber = phoneNumber;
    this.Name = name;
    this.Email = email;
    this.PrimeKey = primeKey;
    this.payByPrime = function (PayAmount, ProductDetail) {
        var payDetail = {
            "prime": this.PrimeKey,
            "vatnumber": "TW45879382",
            "partnerkey": "IoiBBMNOZa97SDH8N4hI67bS297HiW7c7RKt6ivL",
            "merchantid": "Eilis",
            // 本次付款金額
            "amount": PayAmount,
            "currency": "TWD",
            // Eilis系統自定義的識別ID
            "orderid": this.UserID + _genOrderID(),
            // details為完整帳單
            "details": ProductDetail,
            "cardholder": {
                // phonenumber格式為"+886933789987"
                "phonenumber": this.PhoneNumber,
                "name": this.Name,
                "email": this.Email,
                // 下面三個欄位預設為空字串, 呼叫api時必須一併傳入
                "zip": "",
                "addr": "",
                "nationalid": ""
            },
            "instalment": 0,
            "authtocapperiodinday": 0,
            "remember": true,
        };
        var options = {
            uri: 'https://prod.tappayapis.com/tpc/partner/directpay/paybyprime',
            headers: {
                "x-api-key": "IoiBBMNOZa97SDH8N4hI67bS297HiW7c7RKt6ivL"
            },
            method: 'POST',
            body: payDetail,
            json: true
        };

        return requestPromise(options)
            .then(function (parsedBody) {
                // 儲存CardKey, CardToken到DB
                var CardData = {
                    "CardKey": parsedBody.cardsecret.cardkey,
                    "CardToken": parsedBody.cardsecret.cardtoken
                }
                db._update("EilisUser/" + this.UserID + "/UserBasicData", "CardKeys", CardData).then(function () {
                    return Promise.resolve(parsedBody);
                }).catch(function (err) {
                    return Promise.reject("交易完成, 儲存CardKey與CardToken失敗, 原因:" + err);
                });
            })
            .catch(function (err) {
                return Promise.reject("交易失敗, 原因:" + err);
            });
    }
}

// 取得付款總額, 完整購買服務清單
PrimeKeyPayment.prototype.getPayDetail = function (UserID) {
    var Ref = "EilisUser/" + UserID;
    var Childname = "TradeInfo";
    return db._onValuePromise(Ref, Childname).then(function (_PayDetail) {
        return Promise.resolve(_PayDetail);
    }).catch(function (err) {
        return Promise.reject("搜尋使用者本週期款項發生錯誤, 原因:" + err);
    })
}

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

module.exports = PrimeKeyPayment;