var db = require('../../../db/firebase_db.js');
const errorLog = require('../../../tool/ErrorLog.js');
var requestPromise = require('request-promise');

var Receiver = function (adminID, pageName, recipientID, pageToken, messageContent, dbKey, orderID, totalRecipient) {
    this.adminID = adminID;
    this.pageName = pageName;
    this.recipientID = recipientID;
    this.pageToken = pageToken;
    this.dbKey = dbKey;
    this.orderID = orderID;
    this.totalRecipient = totalRecipient;
    this.messageContent = messageContent;
    if (this.adminID && this.pageName && this.recipientID && this.pageToken && this.dbKey) {
        (function sendRequestToFB(adminID, pageName, recipientID, pageToken, messageContent, dbKey, orderID, totalRecipient) {
            setTimeout(function () {
                if(orderID == totalRecipient - 1){
                    console.log(pageName + " 廣播任務完成");
                }
                else if((orderID + 1) % 300 == 0){
                    console.log(pageName + " 廣播進度：" + (orderID + 1) + "/" + totalRecipient);
                }
                sendContent(recipientID, messageContent, pageToken, orderID, totalRecipient).then(function (_Result) {
                    //成功發送訊息
                }).catch(function (err) {
                    //訊息失敗，重新發送訊息
                    sendContent(recipientID, messageContent, pageToken, orderID, totalRecipient).then(function (_Result) {
                        console.log("Re-send message to " + recipientID + " succeed with orderID : " + orderID);
                        //成功發送訊息
                    }).catch(function (err) {
                        //記到DB LOG, 透過後台可手動重新發送
                        console.error("重新發送訊息至用戶" + recipientID + "失敗，錯誤原因：" + err.Log);
                        updateErrorResultToDB(adminID, pageName, recipientID, dbKey, "Card1", err, true).then(function (_Result) {
                        });
                    });
                });
            }, 5000 * parseInt(orderID / 300, 10))
            // 每5秒傳300筆request到FB
        })(this.adminID, this.pageName, this.recipientID, this.pageToken, this.messageContent, this.dbKey, this.orderID, this.totalRecipient);
    }
}
//Error Log to DB
function updateErrorResultToDB(adminID, pageName, recipientID, dbKey, errorCardsID, errorDetailObj, willAddCount) {
    //Date, PageName, ID, CardType, TotalRecipient, ErrorCount, ErrorType, ErrorID
    //UpdateErrorID, errorCardsID
    var ErrorID = recipientID;
    var RefPath = "AllBroadcastRecord/" + pageName + "/" + dbKey + "/Error/" + errorCardsID + "/" + errorDetailObj.ErrorType;
    var ChildName = errorDetailObj.Message;
    var Data = {
        "ErrorID": ErrorID
    }
    return db._push(RefPath, ChildName, Data).then(function () {
        //UpdateErrorCount
        if (willAddCount == true) {
            RefPath = "AllBroadcastRecord/" + pageName + "/" + dbKey + "/ErrorCount";
            var AddCount = 1;
            return db._transactionCount(RefPath, AddCount, function () {
                RefPath = "AllBroadcastRecord/" + pageName + "/" + dbKey + "/" + errorDetailObj.ErrorType + "Count";
                return db._transactionCount(RefPath, AddCount, function () {
                    // 補充扣掉的廣播點數
                    RefPath = "EilisUser/" + adminID + "/ProductInfo/ProductFunction/EilisBroadcastLimit";
                    return db._transactionCount(RefPath, AddCount, function () {
                        return Promise.resolve("Update error result to DB.");
                    }).catch(function (err) {
                        return Promise.reject(err);
                    });
                }).catch(function (err) {
                    return Promise.reject(err);
                });
            }).catch(function (err) {
                return Promise.reject(err);
            });
        }
        else {
            return Promise.resolve("Update error result to DB.");
        }
    })
}
//傳送卡片
function sendContent(recipientID, content, pageToken, orderID, totalRecipient) {
    var messageData = {
        recipient: {
            id: recipientID
        },
        message: content
    };
    return callSendAPI(messageData, pageToken, orderID).then(function (_Message) {
        // 發送成功訊息(預設不顯示)
        //console.log(_Message);
        return Promise.resolve("succeed");
    }).catch(function (err) {
        // 發送失敗訊息
        console.error(err.Log);
        return Promise.reject(err);
    });
}

function callSendAPI(messageData, pageToken, orderID) {
    var options = {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: pageToken },
        headers: {
            'User-Agent': 'Request-Promise'
        },
        method: 'POST',
        body: messageData,
        json: true
    };

    return requestPromise(options)
        .then(function (parsedBody) {
            var recipientID = parsedBody.recipient_id;
            var messageID = parsedBody.message_id;

            return Promise.resolve("Successfully sent card with id " + messageID + " to recipient " + recipientID + " and order is " + orderID);
        })
        .catch(function (err) {
            // FB回傳的問題，通常是用戶刪除對話或已移除帳號
            if (err.name == "StatusCodeError") {
                return Promise.reject({
                    "ErrorType": err.name,
                    "Code": JSON.parse(err.message.split(err.statusCode + " - ")[1]).error.code,
                    "Message": JSON.parse(err.message.split(err.statusCode + " - ")[1]).error.message.replace(/[#.$]/g, ''),
                    "Log": "Error sent card for order " + orderID + " because of " + err,
                    "OrderID": orderID
                })
            }
            // Server端發送的問題，可能是訊息發送頻率太高等問題，通常重發可以成功
            else if (err.name == "RequestError") {
                return Promise.reject({
                    "ErrorType": err.name,
                    "Message": err.message.split("Error: ")[1].replace(/[#.$]/g, ''),
                    "Log": "Error sent card for order " + orderID + " because of " + err,
                    "OrderID": orderID
                })
            }
            // 其他
            return Promise.reject({
                "ErrorType": "OtherError",
                "Message": "Undefined error",
                "Log": "Error sent card for order " + orderID + " because of undefined error",
                "OrderID": orderID
            })
        });
}

module.exports = Receiver;