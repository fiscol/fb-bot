var db = require('../../../db/firebase_db.js');

var Image = function (pageID, content, cardID) {
    this.PageID = pageID;
    this.Content = content;
    this.CardID = cardID;

    // 設定Payload卡片到資料庫
    this.setPayload = function (PageID, Content, SaveToDB) {
        var PayloadContent = {
            attachment: {
                type: "image",
                payload: {
                    url: Content.Url,
                    is_reusable: true
                }
            }
        }
        var PayloadData = {
            type: "Image",
            content: PayloadContent,
            edit: Content
        }

        //  API觸發的卡片, 不寫入資料庫, 直接回傳FB的卡片格式
        if (SaveToDB == false) {
            return Promise.resolve(PayloadDatas);
        }
        // 一般設定卡片, 寫入設定到資料庫
        else {
            var Ref = "EilisFB/" + PageID + "/EilisUI";
            var ChildName = "Payload";
            return db._push(Ref, ChildName, PayloadData).then(function (_Key) {
                return Promise.resolve({
                    "CardID": _Key,
                    "Message": "圖片訊息更新成功"
                });
            }).catch(function (err) {
                return Promise.reject({ "Error": "設定圖片訊息出現錯誤, 原因:" + err });
            });
        }
    }

    // 更新Payload卡片
    this.updatePayload = function (PageID, Content, CardID) {
        var PayloadContent = {
            attachment: {
                type: "image",
                payload: {
                    url: Content.Url,
                    is_reusable: true
                }
            }
        }
        var PayloadData = {
            type: "Image",
            content: PayloadContent,
            edit: Content
        }
        var Ref = "EilisFB/" + PageID + "/EilisUI/Payload";
        var ChildName = CardID;
        return db._update(Ref, ChildName, PayloadData).then(function (_Key) {
            return Promise.resolve({
                "CardID": _Key,
                "Message": "圖片訊息更新成功"
            });
        }).catch(function (err) {
            return Promise.reject({ "Error": "更新圖片訊息出現錯誤, 原因:" + err });
        });
    }
}


module.exports = Image;