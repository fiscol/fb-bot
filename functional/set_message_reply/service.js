var db = require("../../db/firebase_db.js");

// 設定純文字回覆
exports._SetMessageReply = function (req, res) {
    var PageID = req.body.PageID;
    var QAScript = req.body.QAScript;
    if (PageID && QAScript) {
        //console.log(JSON.stringify(QAScript));
        var Ref = "EilisFB/" + PageID;
        var ChildName = "EilisQASetting";
        var QAData = {
            "QAScript": QAScript
        }
        db._set(Ref, ChildName, QAData).then(function () {
            res.json({ "Message": "純文字回覆設定成功" });
        }).catch(function (err) {
            res.json({ "Error": "純文字回覆設定失敗, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "沒有傳入專頁的代碼或回覆內容" });
    }
}