var db = require('../../../db/firebase_db.js');

var MessageCard = function (pageID, content, cardID) {
    this.PageID = pageID;
    this.Content = content;
    this.CardID = cardID;

    // 設定Payload卡片到資料庫
    this.setPayload = function (PageID, Content, SaveToDB) {
        // Content = {
        //     Message: "文字訊息",
        //     ButtonData: [{
        //         Type: "Url",
        //         Title: "產品詳細介紹",
        //         Url: "http://www.eilis-ai.com"
        //     }, {
        //         Type: "Payload",
        //         Title: "平價款式"
        //     }, {
        //         Type: "PhoneNumber",
        //         Title: "聯絡我們",
        //         PhoneNumber: "+886933432737"
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
        for (var i = 0; i < Content.ButtonData.length; i++) {
            if (Content.ButtonData[i].Type == "Url") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: Content.ButtonData[i].Url
                })
            }
            else if (Content.ButtonData[i].Type == "Payload") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "postback",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].Title
                })
            }
            else if (Content.ButtonData[i].Type == "PhoneNumber") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "phone_number",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].PhoneNumber
                })
            }
            else if (Content.ButtonData[i].Type == "Login") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=" + i
                })
            }
        }
        var PayloadData = {
            type: "MessageCard",
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
                    "Message": "文字卡片更新成功"
                });
            }).catch(function (err) {
                return Promise.reject({ "Error": "設定文字卡片出現錯誤, 原因:" + err });
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
        for (var i = 0; i < Content.ButtonData.length; i++) {
            if (Content.ButtonData[i].Type == "Url") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: Content.ButtonData[i].Url
                })
            }
            else if (Content.ButtonData[i].Type == "Payload") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "postback",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].Title
                })
            }
            else if (Content.ButtonData[i].Type == "PhoneNumber") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "phone_number",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].PhoneNumber
                })
            }
            else if (Content.ButtonData[i].Type == "Login") {
                PayloadContent.attachment.payload.buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=" + i
                })
            }
        }
        var PayloadData = {
            type: "MessageCard",
            content: PayloadContent,
            edit: Content
        }
        var Ref = "EilisFB/" + PageID + "/EilisUI/Payload";
        var ChildName = CardID;
        return db._update(Ref, ChildName, PayloadData).then(function (_Key) {
            return Promise.resolve({
                "CardID": _Key,
                "Message": "文字卡片更新成功"
            });
        }).catch(function (err) {
            return Promise.reject({ "Error": "更新文字卡片出現錯誤, 原因:" + err });
        });
    }
}


module.exports = MessageCard;