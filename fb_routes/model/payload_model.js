var PayloadModel = function (pageID, senderID, contentData, quickReply, cardID) {
    this.PageID = pageID;
    this.SenderID = senderID;
    this.Type = (contentData.hasOwnProperty("type")) ? contentData.type : null;
    this.Content = contentData.content;
    this.Edit = (contentData.hasOwnProperty("edit")) ? contentData.edit : null;
    this.CardID = (cardID != null) ? cardID : null;
    this.Data = {
        recipient: {
            id: this.SenderID
        },
        message: this.Content
    };
    if (quickReply != null) {
        this.Data.message["quick_replies"] = quickReply;
    }
    // 用戶的Messenger登入按鈕處理
    // 單張卡片處理
    if (this.Type != "BoxCard" && this.Edit.hasOwnProperty("ButtonData")) {
        for (var i = 0; i < this.Edit.ButtonData.length; i++) {
            if (this.Edit.ButtonData[i].hasOwnProperty("Type") && this.Edit.ButtonData[i].Type == "Login") {
                if (this.Type == "ImageCard" || this.Type == "WebCard") {
                    this.Data.message.attachment.payload.elements[0].buttons[i].url += "&PSID=" + this.SenderID + "&CardID=" + this.CardID;
                }
                else if (this.Type == "MessageCard") {
                    this.Data.message.attachment.payload.buttons[i].url += "&PSID=" + this.SenderID + "&CardID=" + this.CardID;
                }
            }
        }
    }
    // 多張卡片處理
    else if (this.Type == "BoxCard") {
        for (var i = 0; i < this.Edit.length; i++) {
            if (this.Edit[i].hasOwnProperty("ButtonData")) {
                for (var j = 0; j < this.Edit[i].ButtonData.length; j++) {
                    if (this.Edit[i].ButtonData[j].hasOwnProperty("Type") && this.Edit[i].ButtonData[j].Type == "Login") {
                        this.Data.message.attachment.payload.elements[i].buttons[j].url += "&PSID=" + this.SenderID + "&CardID=" + this.CardID;
                    }
                }
            }
        }
    }
}

module.exports = PayloadModel;