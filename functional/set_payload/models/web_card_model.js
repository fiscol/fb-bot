var db = require('../../../db/firebase_db.js');

var WebCard = function (pageID, content, cardID) {
    this.PageID = pageID;
    this.Content = content;
    this.CardID = cardID;

    // 設定Payload卡片到資料庫
    this.setPayload = function (PageID, Content, SaveToDB) {
        // Content = {
        //     ImageUrl: "http://res.cloudinary.com/hrscywv4p/image/upload/c_limit,fl_lossy,h_1440,w_720,f_auto,q_auto/v1/885795/zzcbrpve5rameteipysq.png",
        //     LinkUrl: "http://www.eilis-ai.com",
        //     Title: "EILIS 小助理標準版上線囉！",
        //     SubTitle: "客服自動化，協助小編即時回覆粉絲訊息，行動介面化，隨時隨地只要一機掌握資訊",
        //     ButtonData: [{
        //         Type: "Url",
        //         Title: "產品詳細介紹",
        //         Url: "http://www.eilis-ai.com"
        //     }, {
        //         Type: "Payload",
        //         Title: "平價款式"
        //     }, {
        //         Type: "Share"
        //     }]
        // }
        var PayloadContent = {
            attachment: {
                type: "template",
                payload: {
                    "template_type": "generic",
                    "elements": [{
                        "buttons": []
                    }]
                }
            }
        }
        if (Content.Title) {
            PayloadContent.attachment.payload.elements[0].title = Content.Title
        }
        if (Content.ImageUrl) {
            PayloadContent.attachment.payload.elements[0].image_url = Content.ImageUrl
        }
        if (Content.SubTitle) {
            PayloadContent.attachment.payload.elements[0].subtitle = Content.SubTitle
        }
        if (Content.LinkUrl) {
            PayloadContent.attachment.payload.elements[0].item_url = Content.LinkUrl
        }
        // 解析ButtonData
        for (var i = 0; i < Content.ButtonData.length; i++) {
            if (Content.ButtonData[i].Type == "Url") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: Content.ButtonData[i].Url
                })
            }
            else if (Content.ButtonData[i].Type == "Payload") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "postback",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].Title
                })
            }
            else if (Content.ButtonData[i].Type == "Share") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "element_share"
                })
            }
            else if (Content.ButtonData[i].Type == "PhoneNumber") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "phone_number",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].PhoneNumber
                })
            }
            else if (Content.ButtonData[i].Type == "Login") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=" + i
                })
            }
        }
        var PayloadData = {
            type: "WebCard",
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
                    "Message": "網頁卡片更新成功"
                });
            }).catch(function (err) {
                return Promise.reject({ "Error": "設定網頁卡片出現錯誤, 原因:" + err });
            });
        }
    }

    // 更新Payload卡片
    this.updatePayload = function (PageID, Content, CardID) {
        var PayloadContent = {
            attachment: {
                type: "template",
                payload: {
                    "template_type": "generic",
                    "elements": [{
                        "buttons": []
                    }]
                }
            }
        }
        if (Content.Title) {
            PayloadContent.attachment.payload.elements[0].title = Content.Title
        }
        if (Content.ImageUrl) {
            PayloadContent.attachment.payload.elements[0].image_url = Content.ImageUrl
        }
        if (Content.SubTitle) {
            PayloadContent.attachment.payload.elements[0].subtitle = Content.SubTitle
        }
        if (Content.LinkUrl) {
            PayloadContent.attachment.payload.elements[0].item_url = Content.LinkUrl
        }
        // 解析ButtonData
        for (var i = 0; i < Content.ButtonData.length; i++) {
            if (Content.ButtonData[i].Type == "Url") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: Content.ButtonData[i].Url
                })
            }
            else if (Content.ButtonData[i].Type == "Payload") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "postback",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].Title
                })
            }
            else if (Content.ButtonData[i].Type == "Share") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "element_share"
                })
            }
            else if (Content.ButtonData[i].Type == "PhoneNumber") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "phone_number",
                    title: Content.ButtonData[i].Title,
                    payload: Content.ButtonData[i].PhoneNumber
                })
            }
            else if (Content.ButtonData[i].Type == "Login") {
                PayloadContent.attachment.payload.elements[0].buttons.push({
                    type: "web_url",
                    title: Content.ButtonData[i].Title,
                    url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=" + i
                })
            }
        }
        var PayloadData = {
            type: "WebCard",
            content: PayloadContent,
            edit: Content
        }
        var Ref = "EilisFB/" + PageID + "/EilisUI/Payload";
        var ChildName = CardID;
        return db._update(Ref, ChildName, PayloadData).then(function (_Key) {
            return Promise.resolve({
                "CardID": _Key,
                "Message": "網頁卡片更新成功"
            });
        }).catch(function (err) {
            return Promise.reject({ "Error": "更新網頁卡片出現錯誤, 原因:" + err });
        });
    }
}


module.exports = WebCard;