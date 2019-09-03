var db = require('../../../db/firebase_db.js');

var BoxCard = function (pageID, content, cardID) {
    this.PageID = pageID;
    this.Content = content;
    this.CardID = cardID;

    // 設定Payload卡片到資料庫
    this.setPayload = function (PageID, Content, SaveToDB) {
        // Content = [{
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
        // },
        // {
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
        // }]
        var PayloadContent = {
            attachment: {
                type: "template",
                payload: {
                    "template_type": "generic",
                    "elements": []
                }
            }
        }
        for (var i = 0; i < Content.length; i++) {
            PayloadContent.attachment.payload.elements[i] = {};
            if (Content[i].Title) {
                PayloadContent.attachment.payload.elements[i].title = Content[i].Title
            }
            if (Content[i].ImageUrl) {
                PayloadContent.attachment.payload.elements[i].image_url = Content[i].ImageUrl
            }
            if (Content[i].SubTitle) {
                PayloadContent.attachment.payload.elements[i].subtitle = Content[i].SubTitle
            }
            if (Content[i].LinkUrl) {
                PayloadContent.attachment.payload.elements[i].item_url = Content[i].LinkUrl
            }

            // 解析ButtonData
            if (Content[i].ButtonData) {
                PayloadContent.attachment.payload.elements[i].buttons = [];
                for (var j = 0; j < Content[i].ButtonData.length; j++) {
                    if (Content[i].ButtonData[j].Type == "Url") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "web_url",
                            title: Content[i].ButtonData[j].Title,
                            url: Content[i].ButtonData[j].Url
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "Payload") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "postback",
                            title: Content[i].ButtonData[j].Title,
                            payload: Content[i].ButtonData[j].Title
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "Share") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "element_share"
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "PhoneNumber") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "phone_number",
                            title: Content[i].ButtonData[j].Title,
                            payload: Content[i].ButtonData[j].PhoneNumber
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "Login") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "web_url",
                            title: Content[i].ButtonData[j].Title,
                            url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=" + j + "&CardAt=" + i
                        })
                    }
                }
            }
        }
        
        var PayloadData = {
            type: "BoxCard",
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
                    "Message": "Box卡片更新成功"
                });
            }).catch(function (err) {
                return Promise.reject({ "Error": "設定Box卡片出現錯誤, 原因:" + err });
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
                    "elements": []
                }
            }
        }
        for (var i = 0; i < Content.length; i++) {
            PayloadContent.attachment.payload.elements[i] = {};
            if (Content[i].Title) {
                PayloadContent.attachment.payload.elements[i].title = Content[i].Title
            }
            if (Content[i].ImageUrl) {
                PayloadContent.attachment.payload.elements[i].image_url = Content[i].ImageUrl
            }
            if (Content[i].SubTitle) {
                PayloadContent.attachment.payload.elements[i].subtitle = Content[i].SubTitle
            }
            if (Content[i].LinkUrl) {
                PayloadContent.attachment.payload.elements[i].item_url = Content[i].LinkUrl
            }
            // 解析ButtonData
            if (Content[i].ButtonData) {
                PayloadContent.attachment.payload.elements[i].buttons = [];
                for (var j = 0; j < Content[i].ButtonData.length; j++) {
                    if (Content[i].ButtonData[j].Type == "Url") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "web_url",
                            title: Content[i].ButtonData[j].Title,
                            url: Content[i].ButtonData[j].Url
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "Payload") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "postback",
                            title: Content[i].ButtonData[j].Title,
                            payload: Content[i].ButtonData[j].Title
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "Share") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "element_share"
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "PhoneNumber") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "phone_number",
                            title: Content[i].ButtonData[j].Title,
                            payload: Content[i].ButtonData[j].PhoneNumber
                        })
                    }
                    else if (Content[i].ButtonData[j].Type == "Login") {
                        PayloadContent.attachment.payload.elements[i].buttons.push({
                            type: "web_url",
                            title: Content[i].ButtonData[j].Title,
                            url: "https://api.eilis-ai.com/functional/PSIDLogin?PageID=" + PageID + "&ButtonID=" + j + "&CardAt=" + i
                        })
                    }
                }
            }
        }
        var PayloadData = {
            type: "BoxCard",
            content: PayloadContent,
            edit: Content
        }
        var Ref = "EilisFB/" + PageID + "/EilisUI/Payload";
        var ChildName = CardID;
        return db._update(Ref, ChildName, PayloadData).then(function (_Key) {
            return Promise.resolve({
                "CardID": _Key,
                "Message": "Box卡片更新成功"
            });
        }).catch(function (err) {
            return Promise.reject({ "Error": "更新Box卡片出現錯誤, 原因:" + err });
        });
    }
}


module.exports = BoxCard;