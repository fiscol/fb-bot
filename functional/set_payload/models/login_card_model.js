var db = require('../../../db/firebase_db.js');

var LoginCard = function (pageID, content, cardID) {
    this.PageID = pageID;
    this.Content = content;
    this.CardID = cardID;

    // 設定Payload卡片到資料庫
    this.setPayload = function (PageID, Content, SaveToDB) {
        // Content = {
        //     Message: "文字訊息",
        //     ButtonData: [{
        //         Type: "Login"
        //     }]
        // }
        var PayloadContent = {
            attachment: {
                type: "template",
                payload: {
                    "template_type": "button",
                    "text": Content.Message,
                    "buttons": []
                }
            }
        }
        // 解析ButtonData
        PayloadContent.attachment.payload.buttons[0] = {
            type: "account_link",
            url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=0"
        }

        var PayloadData = {
            type: "LoginCard",
            content: PayloadContent,
            edit: Content
        }

        //  API觸發的卡片, 不寫入資料庫, 直接回傳FB的卡片格式
        if (SaveToDB == false) {
            return Promise.resolve(PayloadData);
        }
        // 一般設定卡片, 寫入設定到資料庫
        else {
            var Ref = "EilisFB/" + PageID + "/EilisUI";
            var ChildName = "Payload";
            return db._push(Ref, ChildName, PayloadData).then(function (_Key) {
                return Promise.resolve({
                    "CardID": _Key,
                    "Message": "登入卡片更新成功"
                });
            }).catch(function (err) {
                return Promise.reject({ "Error": "設定登入卡片出現錯誤, 原因:" + err });
            });
        }
    }

    // 更新Payload卡片
    this.updatePayload = function (PageID, Content, CardID) {
        var PayloadContent = {
            attachment: {
                type: "template",
                payload: {
                    "template_type": "button",
                    "text": Content.Message,
                    "buttons": []
                }
            }
        }
        // 解析ButtonData
        PayloadContent.attachment.payload.buttons[0] = {
            type: "account_link",
            url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=0"
        }
        var PayloadData = {
            type: "LoginCard",
            content: PayloadContent,
            edit: Content
        }
        var Ref = "EilisFB/" + PageID + "/EilisUI/Payload";
        var ChildName = CardID;
        return db._update(Ref, ChildName, PayloadData).then(function (_Key) {
            return Promise.resolve({
                "CardID": _Key,
                "Message": "登入卡片更新成功"
            });
        }).catch(function (err) {
            return Promise.reject({ "Error": "更新登入卡片出現錯誤, 原因:" + err });
        });
    }
}


module.exports = LoginCard;