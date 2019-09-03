var db = require('../../../db/firebase_db.js');
var crypto = require('crypto');
var aes = require('aes-js');
var config = require('../../../config/pay2go_config.js');
var requestPromise = require('request-promise');

var Pay2Go = function (userID) {
    this.UserID = userID;

    // 設定開立發票
    this.setReceipt = function (MerchantOrderNo, Amt) {
        // 開立發票相關參數的官方說明API文件:
        // https://inv.pay2go.com/dw_files/info_api/pay2go_gateway_electronic_invoice_api_V1_1_7.pdf
        var MerchantID = config.StoreMerchantID;
        db._onValuePromise("EilisUser", UserID), then(function (_UserData) {
            //CardKeys
            var CardKeys = _UserData["UserBasicData"]["CardKeys"];
            //從授權資訊找卡片末四碼
            var CardNumbers = _UserData["TradeInfo"]["PurchasedService"]["AuthData"]["AuthDetail"]["CardNo"];
            var CardLastNumbers = CardNumbers.substring(CardNumbers.length - 4);
        })
        if (CardKeys.Category == "B2C") {
            var B2CReceiptDetail = {
                "Amt": Math.round(Amt / 1.05),
                "BuyerAddress": CardKeys.BuyerAddress,
                "BuyerEmail": CardKeys.Email,
                "BuyerName": CardKeys.BuyerName,
                "Category": CardKeys.Category,
                "Comment": "信用卡末四碼:" + CardLastNumbers,
                "ItemAmt": Amt,
                "ItemCount": 1,
                "ItemName": "Eilis月租699方案",
                "ItemPrice": Amt,
                "ItemUnit": "組",
                // Eilis系統自定義的識別ID
                "MerchantOrderNo": MerchantOrderNo,
                "PrintFlag": "Y",
                "RespondType": "JSON",
                "Status": "1",
                "TaxAmt": 0,
                "TaxRate": 5,
                "TaxType": "1",
                "TimeStamp": parseInt(Date.now() / 1000),
                "TotalAmt": Amt,
                "Version": "1.4"
            };
            B2CReceiptDetail.TaxAmt = Amt - B2CReceiptDetail.Amt;
            var B2CPayload = "Amt=" + B2CReceiptDetail.Amt + "&BuyerAddress=" + B2CReceiptDetail.BuyerAddress + "&BuyerEmail=" + B2CReceiptDetail.BuyerEmail + "&BuyerName=" + B2CReceiptDetail.BuyerName + "&Category=" + B2CReceiptDetail.Category + "&Comment=" + B2CReceiptDetail.Comment + "&ItemAmt=" + B2CReceiptDetail.ItemAmt + "&ItemCount=" + B2CReceiptDetail.ItemCount + "&ItemName=" + B2CReceiptDetail.ItemName + "&ItemPrice=" + B2CReceiptDetail.ItemPrice + "&ItemUnit=" + B2CReceiptDetail.ItemUnit + "&MerchantOrderNo=" + B2CReceiptDetail.MerchantOrderNo + "&PrintFlag=" + B2CReceiptDetail.PrintFlag + "&RespondType=" + B2CReceiptDetail.RespondType + "&Status=" + B2CReceiptDetail.Status + "&TaxAmt=" + B2CReceiptDetail.TaxAmt + "&TaxRate=" + B2CReceiptDetail.TaxRate + "&TaxType=" + B2CReceiptDetail.TaxType + "&TimeStamp=" + B2CReceiptDetail.TimeStamp + "&TotalAmt=" + B2CReceiptDetail.TotalAmt + "&Version=" + B2CReceiptDetail.Version;
        }
        else if (CardKeys.Category == "B2B") {
            var B2BReceiptDetail = {
                "Amt": Math.round(Amt / 1.05),
                "BuyerAddress": CardKeys.BuyerAddress,
                "BuyerEmail": CardKeys.Email,
                "BuyerName": CardKeys.BuyerName,
                "BuyerUBN": CardKeys.BuyerUBN,
                "Category": "B2B",
                "Comment": "信用卡末四碼:" + CardLastNumbers,
                "ItemAmt": Math.round(Amt / 1.05),
                "ItemCount": 1,
                "ItemName": "Eilis月租699方案",
                "ItemPrice": Math.round(Amt / 1.05),
                "ItemUnit": "組",
                // Eilis系統自定義的識別ID
                "MerchantOrderNo": MerchantOrderNo,
                "PrintFlag": "Y",
                "RespondType": "JSON",
                "Status": "1",
                "TaxAmt": 0,
                "TaxRate": 5,
                "TaxType": "1",
                "TimeStamp": parseInt(Date.now() / 1000),
                "TotalAmt": Amt,
                "Version": "1.4"
            };
            B2BReceiptDetail.TaxAmt = Amt - B2BReceiptDetail.Amt;
            var B2BPayload = "Amt=" + B2BReceiptDetail.Amt + "&BuyerAddress=" + B2BReceiptDetail.BuyerAddress + "&BuyerEmail=" + B2BReceiptDetail.BuyerEmail + "&BuyerName=" + B2BReceiptDetail.BuyerName + "&BuyerUBN=" + B2BReceiptDetail.BuyerUBN + "&Category=" + B2BReceiptDetail.Category + "&Comment=" + B2BReceiptDetail.Comment + "&ItemAmt=" + B2BReceiptDetail.ItemAmt + "&ItemCount=" + B2BReceiptDetail.ItemCount + "&ItemName=" + B2BReceiptDetail.ItemName + "&ItemPrice=" + B2BReceiptDetail.ItemPrice + "&ItemUnit=" + B2BReceiptDetail.ItemUnit + "&MerchantOrderNo=" + B2BReceiptDetail.MerchantOrderNo + "&PrintFlag=" + B2BReceiptDetail.PrintFlag + "&RespondType=" + B2BReceiptDetail.RespondType + "&Status=" + B2BReceiptDetail.Status + "&TaxAmt=" + B2BReceiptDetail.TaxAmt + "&TaxRate=" + B2BReceiptDetail.TaxRate + "&TaxType=" + B2BReceiptDetail.TaxType + "&TimeStamp=" + B2BReceiptDetail.TimeStamp + "&TotalAmt=" + B2BReceiptDetail.TotalAmt + "&Version=" + B2BReceiptDetail.Version;
        }
        var Payload = (CardKeys.Category == "B2C") ? B2CPayload : B2BPayload;
        var PostData = _GetEncryptedPostData(config.StoreHashKey, config.StoreHashIV, Payload);
        var cbc = new aes.ModeOfOperation.cbc(new Buffer(config.StoreHashKey), new Buffer(config.StoreHashIV));
        console.log(aes.utils.utf8.fromBytes(cbc.decrypt(aes.utils.hex.toBytes(PostData))));

        var options = {
            uri: config.ReceiptSubmitUri,
            method: 'POST',
            headers: {
                'User-Agent': 'Request-Promise'
            },
            form: {
                "MerchantID_": MerchantID,
                "PostData_": PostData
            },
            method: 'POST'
        };

        return requestPromise(options).then(function (parsedBody) {
            //console.log(parsedBody);
            // return Promise.resolve("設定FB專頁subscribe串接webhook成功");
            return Promise.resolve(JSON.parse(JSON.parse(parsedBody).Result));
        }).catch(function (err) {
            return Promise.reject("設定第三方開立發票服務失敗, 原因:" + err);
        });
    }
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
var _genPeriodDay = function (BonusDays) {
    var today = new Date();

    // 特殊狀況: 若優惠天數剛好為0, 取隔天為第一個付款日
    BonusDays = (BonusDays != 0) ? BonusDays : 1;
    var payDay = _addDays(today, BonusDays);
    var dayOfMonth = payDay.getDate();
    // 智付通以Varchar格式設定付款日, 個位數前面要補零
    if (dayOfMonth < 10) {
        dayOfMonth = "0" + dayOfMonth.toString();
    }
    // 特殊狀況: 若為29, 30, 31則以隔月1號為付款日
    else if (dayOfMonth > 28) {
        dayOfMonth = "01";
    }
    return dayOfMonth.toString();
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

module.exports = Pay2Go;