var db = require('../../../db/firebase_db.js');
var request = require('request');
var requestPromise = require('request-promise');

var Refund = function (rectradeid, amount) {
    this.refundDetail = {
        "vatnumber": "TW45879382",
        "partnerkey": "IoiBBMNOZa97SDH8N4hI67bS297HiW7c7RKt6ivL",
        // Apple Pay退款時才需要此參數
        //"merchantid": "Eilis",
        "rectradeid": rectradeid
    };
    // 退款金額(amount)為null時，退回該筆轉帳的全額
    if(amount != null){
        this.refundDetail.amount = amount;
    }
    this.refundWithAmount = function (refundDetail) {
        var options = {
            uri: 'https://prod.tappayapis.com/tpc/partner/fastrefund',
            headers: {
                "x-api-key": "IoiBBMNOZa97SDH8N4hI67bS297HiW7c7RKt6ivL"
            },
            method: 'POST',
            body: refundDetail,
            json: true
        };

        return requestPromise(options)
            .then(function (parsedBody) {
                return Promise.resolve(parsedBody);
            })
            .catch(function (err) {
                return Promise.reject("err:" + err);
            });
    }
}

module.exports = Refund;