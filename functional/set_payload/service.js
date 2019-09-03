var db = require("../../db/firebase_db.js");
var message = require("./models/message_model.js");
var image = require("./models/image_model.js");
var video = require("./models/video_model.js");
var messageCard = require("./models/message_card_model.js");
var imageCard = require("./models/img_card_model.js");
var webCard = require("./models/web_card_model.js");
var boxCard = require("./models/box_card_model.js");
var loginCard = require("./models/login_card_model.js");
var blueMenu = require("./models/blue_menu_model.js");
var other = require("./models/other_model.js");
var apiMessengerReply = require("./models/api_messenger_reply.js");
const Q = require('q');


// 設定卡片(寫入DB綁定)
exports._SetPayload = function (req, res) {
    var PageID = req.body.PageID;
    var Type = req.body.Type;
    var Content = req.body.Content;
    var Title = req.body.Title;
    var SaveToDB = (req.body.hasOwnProperty("SaveToDB")) ? req.body.SaveToDB : true;
    if (PageID && Type && Content) {
        try {
            switch (Type) {
                case "Message":
                    var Message = new message(PageID, Content, null);
                    Message.setPayload(Message.PageID, Message.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "Image":
                    var Image = new image(PageID, Content, null);
                    Image.setPayload(Image.PageID, Image.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "Video":
                    var Video = new video(PageID, Content, null);
                    Video.setPayload(Video.PageID, Video.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "MessageCard":
                    var MessageCard = new messageCard(PageID, Content, null);
                    MessageCard.setPayload(MessageCard.PageID, MessageCard.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "ImageCard":
                    var ImageCard = new imageCard(PageID, Content, null);
                    ImageCard.setPayload(ImageCard.PageID, ImageCard.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "WebCard":
                    var WebCard = new webCard(PageID, Content, null);
                    WebCard.setPayload(WebCard.PageID, WebCard.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "BoxCard":
                    var BoxCard = new boxCard(PageID, Content, null);
                    BoxCard.setPayload(BoxCard.PageID, BoxCard.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "LoginCard":
                    var LoginCard = new loginCard(PageID, Content, null);
                    LoginCard.setPayload(LoginCard.PageID, LoginCard.Content, SaveToDB).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "BlueMenu":
                    var BlueMenu = new blueMenu(PageID, Content, Title);
                    BlueMenu.setPayload(BlueMenu.PageID, BlueMenu.Content, BlueMenu.Title).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                // case "Other":
                //     break;
                default:
                    res.json({ "Error": "未傳入正確卡片類型，卡片設定失敗" });
                    break;
            }
        }
        catch (err) {
            res.json("設定卡片失敗，原因:" + err);
        }
    }
    else {
        res.json({ "Error": "未傳入專頁代碼或卡片內容，設定失敗" });
    }
}

// 更新卡片
exports._UpdatePayload = function (req, res) {
    var PageID = req.body.PageID;
    var Type = req.body.Type;
    var Content = req.body.Content;
    var CardID = req.body.CardID;
    if (PageID && Type && Content && CardID) {
        try {
            switch (Type) {
                case "Message":
                    var Message = new message(PageID, Content, CardID);
                    Message.updatePayload(Message.PageID, Message.Content, Message.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "Image":
                    var Image = new image(PageID, Content, CardID);
                    Image.updatePayload(Image.PageID, Image.Content, Image.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "Video":
                    var Video = new video(PageID, Content, CardID);
                    Video.updatePayload(Video.PageID, Video.Content, Video.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "MessageCard":
                    var MessageCard = new messageCard(PageID, Content, CardID);
                    MessageCard.updatePayload(MessageCard.PageID, MessageCard.Content, MessageCard.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "ImageCard":
                    var ImageCard = new imageCard(PageID, Content, CardID);
                    ImageCard.updatePayload(ImageCard.PageID, ImageCard.Content, ImageCard.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "WebCard":
                    var WebCard = new webCard(PageID, Content, CardID);
                    WebCard.updatePayload(WebCard.PageID, WebCard.Content, WebCard.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "BoxCard":
                    var BoxCard = new boxCard(PageID, Content, CardID);
                    BoxCard.updatePayload(BoxCard.PageID, BoxCard.Content, BoxCard.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                case "LoginCard":
                    var LoginCard = new loginCard(PageID, Content, CardID);
                    LoginCard.updatePayload(LoginCard.PageID, LoginCard.Content, LoginCard.CardID).then(function (_Result) {
                        res.json(_Result);
                    });
                    break;
                // case "Other":
                //     break;
                default:
                    res.json({ "Error": "未傳入正確卡片類型，卡片設定失敗" });
                    break;
            }
        }
        catch (err) {
            res.json("設定卡片失敗，原因:" + err);
        }
    }
    else {
        res.json({ "Error": "未傳入專頁代碼或卡片內容，設定失敗" });
    }
}

// 取得卡片
exports._GetPayload = function (req, res) {
    var PageID = req.body.PageID;
    var CardID = req.body.CardID;
    if (PageID && CardID) {
        db._onValuePromise("EilisFB/" + PageID + "/EilisUI/Payload", CardID).then(function (_CardData) {
            res.json({
                "Content": _CardData.edit,
                "Type": _CardData.type
            });
        }).catch(function (err) {
            res.json({ "Error": "取得卡片出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入專頁代碼或卡片代碼，取得卡片失敗" });
    }
}

// 移除卡片
exports._DeletePayload = function (req, res) {
    var PageID = req.body.PageID;
    var CardID = req.body.CardID;
    if (PageID && CardID) {
        db._onValuePromise("EilisFB/" + PageID + "/EilisUI/Payload", CardID).then(function (_CardData) {
            if (_CardData != null) {
                db._set("EilisFB/" + PageID + "/EilisUI/Payload", CardID, {}).then(function () {
                    res.json({ "Message": "已移除卡片：" + CardID });
                }).catch(function (err) {
                    res.json({ "Error": "移除卡片出現錯誤, 原因:" + err });
                });
            }
            else {
                res.json({ "Error": "找不到卡片：" + CardID + ", 並未移除卡片" });
            }
        }).catch(function (err) {
            res.json({ "Error": "移除卡片出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入專頁代碼或卡片代碼，移除卡片失敗" });
    }
}

// 取得WorkFlow(卡片排程清單)
exports._GetWorkFlow = function (req, res) {
    var PageID = req.body.PageID;
    var Name = req.body.Name;
    if (PageID && Name) {
        db._onValuePromise("EilisFB/" + PageID, "EilisUI").then(function (_EilisUIData) {
            var ReturnWorkFlowData = {
                "WorkFlow": {}
            };
            if (_EilisUIData.hasOwnProperty("WorkFlow")) {
                if (Name && Name != "All") {
                    Object.keys(_EilisUIData["WorkFlow"]).forEach(function (key) {
                        if (_EilisUIData["WorkFlow"][key]["CardName"] == Name) {
                            ReturnWorkFlowData.WorkFlow = _EilisUIData["WorkFlow"][key]
                            delete ReturnWorkFlowData["CardName"];
                            res.json(ReturnWorkFlowData);
                        }
                    });
                }
                else if (Name == "All") {
                    var PayloadArray = Object.getOwnPropertyNames(_EilisUIData["Payload"]);
                    Object.keys(_EilisUIData["WorkFlow"]).forEach(function (key) {
                        var WorkFlowCards = _EilisUIData["WorkFlow"][key]["Cards"];
                        var WorkFlowName = _EilisUIData["WorkFlow"][key]["CardName"];
                        WorkFlowCards.map(function (CardPayload, Index) {
                            if (Index == 0) {
                                ReturnWorkFlowData["WorkFlow"][WorkFlowName] = _EilisUIData["WorkFlow"][key];
                                delete ReturnWorkFlowData["WorkFlow"][WorkFlowName]["CardName"];
                            }
                            if (PayloadArray.indexOf(CardPayload) != -1) {
                                if (PayloadArray.indexOf(CardPayload) != -1) {
                                    PayloadArray.splice(PayloadArray.indexOf(CardPayload), 1);
                                }
                            }
                        })
                    });
                    if (PayloadArray.length != 0) {
                        ReturnWorkFlowData["WorkFlow"]["OtherCards"] = {
                            "Cards": PayloadArray,
                            "Reply": null
                        }
                    }
                    res.json({ "WorkFlow": ReturnWorkFlowData["WorkFlow"] });
                }
                else {
                    res.json({ "Error": "目前沒有已設定的WorkFlow" });
                }
            }
            else {
                if (Name == "All" && _EilisUIData.hasOwnProperty("Payload")) {
                    var PayloadArray = Object.getOwnPropertyNames(_EilisUIData["Payload"]);
                    if (PayloadArray.length != 0) {
                        ReturnWorkFlowData["WorkFlow"]["OtherCards"] = {
                            "Cards": PayloadArray,
                            "Reply": null
                        }
                    }
                    res.json({ "WorkFlow": ReturnWorkFlowData["WorkFlow"] });
                }
                else {
                    res.json({ "Error": "目前沒有已設定的WorkFlow" });
                }
            }
        }).catch(function (err) {
            res.json({ "Error": "取得WorkFlow出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入專頁代碼或WorkFlow名稱，取得WorkFlow失敗" });
    }
}

// 移除WorkFlow
exports._DeleteWorkFlow = function (req, res) {
    var PageID = req.body.PageID;
    var Name = req.body.Name;
    if (PageID && Name) {
        db._onValuePromise("EilisFB/" + PageID + "/EilisUI", "WorkFlow").then(function (_WorkFlowData) {
            if (_WorkFlowData != null) {
                var HasWorkFlowName = false;
                Object.keys(_WorkFlowData).forEach(function (key, index) {
                    var WorkFlowName = _WorkFlowData[key]["CardName"];
                    if (WorkFlowName == Name) {
                        HasWorkFlowName = true;
                        db._set("EilisFB/" + PageID + "/EilisUI/WorkFlow", key, {}).then(function () {
                            res.json({ "Message": "已移除WorkFlow：" + Name });
                        }).catch(function (err) {
                            res.json({ "Error": "移除WorkFlow出現錯誤, 原因:" + err });
                        });
                    }
                    else if (index == Object.keys(_WorkFlowData).length - 1 && HasWorkFlowName == false) {
                        res.json({ "Error": "找不到WorkFlow：" + Name + ", 並未移除WorkFlow" });
                    }
                });
            }
            else {
                res.json({ "Error": "找不到WorkFlow：" + Name + ", 並未移除WorkFlow" });
            }
        }).catch(function (err) {
            res.json({ "Error": "移除WorkFlow出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入專頁代碼或WorkFlow名稱，移除WorkFlow失敗" });
    }
}

// 取得藍色選單
exports._GetBlueMenu = function (req, res) {
    var PageID = req.body.PageID;
    var Title = req.body.Title || "公版主選單";
    if (PageID && Title) {
        // 雙層選單在資料庫針對特殊字元是用全形儲存處理
        Title = HalfWidthToFullWidth(Title);
        db._onValuePromise("EilisFB/" + PageID, "EilisUI").then(function (_EilisUIData) {
            if (_EilisUIData.hasOwnProperty("Menu")) {
                if (_EilisUIData["Menu"].hasOwnProperty(Title)) {
                    var ReturnData = {
                        "Content": _EilisUIData["Menu"][Title]["edit"],
                        "WorkFlow": {}
                    }
                    Object.keys(_EilisUIData["WorkFlow"]).forEach(function (key, index) {
                        var WorkFlowName = _EilisUIData["WorkFlow"][key]["CardName"];
                        ReturnData.WorkFlow[WorkFlowName] = _EilisUIData["WorkFlow"][key];
                        delete ReturnData.WorkFlow[WorkFlowName]["CardName"];
                    });
                    res.json(ReturnData);
                }
                else {
                    res.json({ "Error": "沒有找到相關的藍色選單" });
                }
            }
            else {
                res.json({ "Error": "目前沒有已設定的藍色選單" });
            }
        }).catch(function (err) {
            res.json({ "Error": "取得藍色選單出現錯誤, 原因:" + err });
        });
    }
    else {
        res.json({ "Error": "未傳入專頁代碼，取得藍色選單失敗" });
    }
}

// 更新WorkFlow(卡片排程清單)
exports._UpdateWorkFlow = function (req, res) {
    var PageID = req.body.PageID;
    var Name = req.body.Name;
    var WorkFlow = req.body.WorkFlow;
    if (PageID && Name && WorkFlow) {
        WorkFlow.CardName = Name;
        db._onValuePromise("EilisFB/" + PageID + "/EilisUI", "WorkFlow").then(function (_WorkFlowData) {
            if (_WorkFlowData != null) {
                var HasWorkFlowName = false;
                Object.keys(_WorkFlowData).forEach(function (key, index) {
                    var WorkFlowName = _WorkFlowData[key]["CardName"];
                    if (WorkFlowName == Name) {
                        HasWorkFlowName = true;
                        db._update("EilisFB/" + PageID + "/EilisUI/WorkFlow", key, WorkFlow).then(function () {
                            res.json({ "Message": "已更新WorkFlow：" + Name });
                        }).catch(function (err) {
                            res.json({ "Error": "更新WorkFlow出現錯誤, 原因:" + err });
                        });
                    }
                    else if (index == Object.keys(_WorkFlowData).length - 1 && HasWorkFlowName == false) {
                        db._push("EilisFB/" + PageID + "/EilisUI", "WorkFlow", WorkFlow).then(function () {
                            res.json({ "Message": "更新WorkFlow成功" });
                        }).catch(function (err) {
                            res.json({ "Error": "更新WorkFlow出現錯誤, 原因:" + err });
                        });
                    }
                });
            }
            else {
                db._push("EilisFB/" + PageID + "/EilisUI", "WorkFlow", WorkFlow).then(function () {
                    res.json({ "Message": "更新WorkFlow成功" });
                }).catch(function (err) {
                    res.json({ "Error": "更新WorkFlow出現錯誤, 原因:" + err });
                });
            }
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數，更新WorkFlow失敗" });
    }
}

exports._TransferWorkflow = function (req, res) {
    // var PageID = req.body.PageID;
    // if (PageID) {
    db._onValuePromiseWithoutChild("EilisFB").then(function (_PageData) {
        var PageIDArr = Object.getOwnPropertyNames(_PageData);
        var TotalPage = PageIDArr.length;
        var HasWorkFlowPage = 0;
        var WorkFlowCompletePage = 0;
        var CompletePage = 0;
        for (var i = 0; i < PageIDArr.length; i++) {
            var _EilisUIData = _PageData[PageIDArr[i]].EilisUI || {};
            if (_EilisUIData.hasOwnProperty("WorkFlow") && PageIDArr[i] != "186494085209672" && PageIDArr[i] != "436040610088572") {
                HasWorkFlowPage += 1;
                var PromiseArr = [];
                var WorkFlowNameArr = Object.getOwnPropertyNames(_EilisUIData.WorkFlow);
                for (var j = 0; j < WorkFlowNameArr.length; j++) {
                    PromiseArr.push(TransWorkFlow(WorkFlowNameArr[j], _EilisUIData.WorkFlow[WorkFlowNameArr[j]], PageIDArr[i]));
                }
                var Step1 = Q.all(PromiseArr);
                Step1.then(function (_result) {
                    CompletePage += 1;
                    WorkFlowCompletePage += 1;
                    console.log("Workflow:" + WorkFlowCompletePage + "/" + HasWorkFlowPage);
                    console.log("Total:" + CompletePage + "/" + TotalPage);
                    if (HasWorkFlowPage == WorkFlowCompletePage && TotalPage == CompletePage) {
                        res.json({ "Message": "OK" });
                    }
                });
            }
            else {
                CompletePage += 1;
                console.log("Workflow:" + WorkFlowCompletePage + "/" + HasWorkFlowPage);
                console.log("Total:" + CompletePage + "/" + TotalPage);
                if (HasWorkFlowPage == WorkFlowCompletePage && TotalPage == CompletePage) {
                    res.json({ "Message": "OK" });
                }
            }
        }
    })
    // }
    // else {
    //     res.json({ "Error": "未傳入正確參數，更新WorkFlow失敗" });
    // }
}

// API對接私訊卡片設定
exports._APIMessengerReply = function (req, res) {
    var PageID = req.body.PageID;
    var Keywords = req.body.Keywords;
    var Status = req.body.Status;
    var Url = req.body.Url;
    if (PageID && Keywords && Status && Url) {
        var APIMessengerReply = new apiMessengerReply(PageID, Keywords, Status, Url);
        APIMessengerReply.SetReplySetting(APIMessengerReply).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "設定API私訊自動回覆失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數，API對接私訊卡片設定失敗" });
    }
}

// 查詢API對接私訊卡片設定
exports._GetAPIMessengerSetting = function (req, res) {
    var PageID = req.body.PageID;
    if (PageID) {
        var APIMessengerReply = new apiMessengerReply(PageID, null, null, null);
        APIMessengerReply.GetAPIMessengerSetting(APIMessengerReply).then(function (_Result) {
            res.json(_Result);
        }).catch(function (err) {
            res.json({ "Error": "查詢API對接私訊卡片設定失敗, 原因:" + err });
        })
    }
    else {
        res.json({ "Error": "未傳入正確參數，查詢API對接私訊卡片設定失敗" });
    }
}

function TransWorkFlow(CardName, WorkFlowData, PageID) {
    var deferred = Q.defer();
    WorkFlowData["CardName"] = CardName;
    // deferred.resolve("OK");
    db._push("EilisFB/" + PageID + "/EilisUI", "WorkFlow", WorkFlowData).then(function () {
        db._set("EilisFB/" + PageID + "/EilisUI/WorkFlow", CardName, {}).then(function () {
            deferred.resolve("Succeed");
        }).catch(function (err) {
            deferred.reject(response.error);
        })
    }).catch(function (err) {
        deferred.reject(response.error);
    })
    return deferred.promise;
}

// 半形轉全形(Firebase特殊字元處理)
function HalfWidthToFullWidth(input) {
    return input.replace("$", "＄").replace("#", "＃").replace(".", "．").replace("[", "［").replace("]", "］");
}