var db = require('../../../db/firebase_db.js');
var request = require('request');
var requestPromise = require('request-promise');

var TradeRecord = function () {
    this.queryDetail = {
        "vatnumber": "TW45879382",
        "partnerkey": "IoiBBMNOZa97SDH8N4hI67bS297HiW7c7RKt6ivL",
        "recordsperpage": 50,
        "page": 0,
        "filters": {
            /*"time": {
                "starttime": long,
                "endtime": long
            },*/
            "amount": {
                "upperlimit": 99999999,
                "lowerlimit": 0
            },
            "appid": 10431,
            "merchantid": "Eilis"
            //"recordstatus": int,
            //"rectradeid": String
        },
        "orderby": {
            "attribute": "time", // "time"(時間排序) 或 "amount"(金額排序)
            "isdescending": true
        }
    };
    this.getTradeRecord = function (queryDetail) {
        var options = {
            uri: 'https://prod.tappayapis.com/tpc/partner/getrecordsplus',
            headers: {
                "x-api-key": "IoiBBMNOZa97SDH8N4hI67bS297HiW7c7RKt6ivL"
            },
            method: 'POST',
            body: queryDetail,
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

module.exports = TradeRecord;