const db = require('../db/firebase_db.js');
const TimeNow = require('./TimeNow.js');

exports._ErrorLogToDB = function (ErrorMessage) {
    var Ref = "EilisLog/";
    var Child = TimeNow.DateNowDBChild();
    var SenderMessageObj = new Object();

    SenderMessageObj.ErrorTime = TimeNow.TimeNow();
    SenderMessageObj.ErrorMessage = (typeof (ErrorMessage) == "object") ? JSON.stringify(ErrorMessage) : ErrorMessage;
    console.error("Eilis功能出現錯誤，發生時間：" + SenderMessageObj.ErrorTime + "，錯誤敘述：" + SenderMessageObj.ErrorMessage)

    db._push(Ref, Child, SenderMessageObj).then(function () {
        console.log("已寫入系統錯誤訊息到資料庫");
    }).catch(function (err) {
        console.error("寫入錯誤資訊到資料庫出現錯誤，原因：" + err);
    });
}