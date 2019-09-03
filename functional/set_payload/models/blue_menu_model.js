var db = require('../../../db/firebase_db.js');

var BlueMenu = function (pageID, content, title) {
    this.PageID = pageID;
    this.Content = content;
    this.Title = title;

    // 設定Payload卡片到資料庫
    this.setPayload = function (PageID, Content, Title) {
        // Content = {
        //     "Message":"歡迎來到Eilis，底下的藍色按鈕可能有您需要的服務喔！",
        //     "Menu":["索取折價券","限時折扣","穿搭困擾求救","風格選擇","依場合穿搭"]
        // }
        var PayloadContent = {
            text: Content.Message,
            quick_replies: []
        }
        // 解析ButtonData
        for (var i = 0; i < Content.Menu.length; i++) {
            PayloadContent.quick_replies.push({
                "content_type": "text",
                "title": Content.Menu[i],
                "payload": Content.Menu[i]
            })
        }
        var PayloadData = {
            content: PayloadContent,
            edit: Content
        }
        var Ref = "EilisFB/" + PageID + "/EilisUI/Menu";
        // 雙層選單在資料庫針對特殊字元是用全形儲存處理
        var ChildName = (Title == null) ? "公版主選單" : HalfWidthToFullWidth(Title);
        return db._set(Ref, ChildName, PayloadData).then(function () {
            // return db._update("EilisFB/" + PageID + "/EilisUI", "WorkFlow", WorkFlow).then(function () {
            return Promise.resolve({ "Message": "藍色選單設定成功" });
            // }).catch(function (err) {
            //     return Promise.reject({ "Error": "更新藍色選單相關WorkFlow出現錯誤, 原因:" + err });
            // });
        }).catch(function (err) {
            return Promise.reject({ "Error": "設定藍色選單出現錯誤, 原因:" + err });
        });
    }
}

// 半形轉全形(Firebase特殊字元處理)
function HalfWidthToFullWidth(input){
    return input.replace("$", "＄").replace("#", "＃").replace(".", "．").replace("[", "［").replace("]", "］");
}
module.exports = BlueMenu;