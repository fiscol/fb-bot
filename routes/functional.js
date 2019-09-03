const express = require('express');
const router = express.Router();
const schedule = require('node-schedule');

// Import functional services
const functionalPath = "../functional/";
const serviceFileName = "/service.js";

// FB登入相關
const UsersLoginService = require("../functional/users_login/service.js");
// 加入專頁，初始化設定相關
const PageSettingService = require("../functional/page_setting/service.js");
// 廣播相關
const BroadcastService = require("../functional/broadcast/service.js");
// 上傳功能相關
const UploadService = require("../functional/upload_file/service.js");
// 金流相關
const PaymentService = require("../functional/payment/service.js");
// 設置開始使用按鈕與背景問候語鈕
const SetGreetingService = require("../functional/set_greeting/service.js");
// 設定智慧常駐選單
const SetPermanentMenuService = require("../functional/set_permanent_menu/service.js");
// 設定純文字回覆
const SetMessageReplyService = require("../functional/set_message_reply/service.js");
// 設定商務版常駐選單
const SetBusinessMenuService = require("../functional/set_business_menu/service.js");
// 設定商務版單層智能選單(藍色選單)
const SetPayloadService = require("../functional/set_payload/service.js");
// 定時服務相關
const ScheduleService = require("../functional/schedule/service.js");
// 留言相關
const CommentService = require("../functional/comment/service.js");
// 標籤PSID相關
const TagService = require("../functional/tag/service.js");
// 粉專管理員相關
const PageAdminService = require("../functional/page_admin/service.js");
// 開發使用
const DevService = require("../functional/dev/service.js");

var securityCheck = function (req, res, next) {
    if (req.headers.webtoken && req.headers.userid) {
        UsersLoginService._VerifyWebToken(req.headers).then(function (_Result) {
            next();
        }).catch(function (err) {
            if (err.hasOwnProperty("LoginError")) {
                res.status(401).json(err);
            }
            else {
                res.status(403).json(err);
            }
        });
    }
    else if (!req.headers.webtoken && req.headers.userid) {
        res.status(401).json({ "LoginError": "用戶尚未登入，請重新登入Eilis系統" });
    }
    else {
        res.status(403).json({ "Error": "沒有使用權限設定Eilis功能" });
    }
}

// Controller, route to services function

//// FB登入相關區塊
// 導頁到後台(含FB第一階段驗證, 設定取得FB Graph API的權限)
router.get('/LoginEilis', UsersLoginService._LoginEilis);
// 導頁到後台(含FB第二階段驗證, 儲存用戶FB個人, 管理專頁資訊到DB)
router.get('/SaveUserFBDetail', UsersLoginService._SaveUserFBDetail);
// 回傳使用者FB資料api
router.post('/GetFBData', UsersLoginService._GetFBData);
router.post('/GetFBDataAuthDev', securityCheck, UsersLoginService._GetFBData);
// 登出系統
router.get('/LogoutEilis', UsersLoginService._LogoutEilis);
// 排程更新使用者BonusDays(倒數計時功能)
var UpdateBonusDays = schedule.scheduleJob('00 00 * * *', UsersLoginService._RefreshBonusDays);
// 導頁到後台(含FB第一階段驗證, 設定取得FB Graph API的權限)
router.get('/PSIDLogin', UsersLoginService._PSIDLogin);
// 導頁到後台(含FB第二階段驗證, 儲存用戶FB個人, 管理專頁資訊到DB)
router.get('/SaveUserID', UsersLoginService._SaveUserID);

//// 加入專頁，初始化設定相關區塊
// 加入專頁到Eilis
router.post('/AddPageToEilis', PageSettingService._AddPageToEilis);
// 回傳用戶服務規格
router.post('/GetPlanDetail', PageSettingService._GetPlanDetail);
//*** 回傳已填資訊(卡片格式可再調整)
router.post('/GetEditedDetail', PageSettingService._GetEditedDetail);
// 暫停所有功能(對單一專頁)
router.post('/SuspendFunctions', PageSettingService._SuspendFunctions);
router.get('/SuspendFunctionsDev', PageSettingService._SuspendFunctionsDev);
// 復原所有功能(對單一專頁)
router.post('/RestartFunctions', PageSettingService._RestartFunctions);
router.get('/RestartFunctionsDev', PageSettingService._RestartFunctionsDev);
// 取得用戶付費方案種類
router.post('/GetUserPlan', PageSettingService._GetUserPlan);
// 用戶切換付費方案
router.post('/ChangePlan', PageSettingService._ChangePlan);
// 設定新付費方案
router.post('/SetNewPlan', PageSettingService._SetNewPlan);
// 取得方案內容
router.post('/GetPlanContent', PageSettingService._GetPlanContent);
// 更新方案內容
router.post('/UpdatePlan', PageSettingService._UpdatePlan);
// 開啟非客服時間回覆
router.post('/TurnOnOfficeSetting', PageSettingService._TurnOnOfficeSetting);
// 關閉非客服時間回覆
router.post('/TurnOffOfficeSetting', PageSettingService._TurnOffOfficeSetting);

//// 廣播相關區塊
// 文字廣播
router.post('/BroadcastMessage', BroadcastService._BroadcastMessage);
// 圖片廣播
router.post('/BroadcastImage', BroadcastService._BroadcastImage);
// 新版Payload廣播(各種廣播格式都可以)
router.post('/BroadcastPayload', BroadcastService._BroadcastPayload);
// 取得廣播人數, 廣播餘額
router.post('/GetBroadcastDetail', BroadcastService._GetBroadcastDetail);
// 臨時加值廣播功能
router.post('/AddBroadcastLimit', BroadcastService._AddBroadcastLimit);

//// 上傳功能相關區塊
// 圖片上傳
router.post('/UploadImage', UploadService._UploadImage);
// 影片上傳
router.post('/UploadVideo', UploadService._UploadVideo);

//// 金流相關區塊
//*** 帳單需要分別在DB設計，以不同筆方便交易紀錄 ***/
// 儲存Prime Key及部分使用者資訊到資料庫
router.post('/SetPayBasicData', PaymentService._SetPayBasicData);
// 用智付通信用卡一次性付款
router.post('/PayWithSmartPay', PaymentService._PayWithSmartPay);
// 智付通一次性付款成功
router.post('/SmartPaySucceed', PaymentService._SmartPaySucceed);
// 設定智付通信用卡定期定額付款
router.post('/PayWithSmartPayPeriod', PaymentService._PayWithSmartPayPeriod);
// 智付通定期定額設定成功
router.post('/SmartPayPeriodSucceed/:UserID', PaymentService._SmartPayPeriodSucceed);
// 智付通定期定額單次支付成功
router.post('/SmartPayPeriodNotify/:UserID', PaymentService._SmartPayPeriodNotify);
// 回傳一次性付款歷史交易紀錄API
router.post('/GetOncePayHistory', PaymentService._GetOncePayHistory);
// 回傳專頁已建立的定期定額付款授權
router.post('/GetPeriodPayAuth', PaymentService._GetPeriodPayAuth);
// 手動由客服協助設定付費狀態(匯款等方式)
router.post('/PayByOtherWay', PaymentService._PayByOtherWay);

//// 設置開始使用按鈕與背景問候語鈕區塊
// 設定使用前聊天視窗背景問候語
// *** Fiscol @ 5/18 : 目前只有手機版介面看得到這個功能 ***
router.post('/SetGreeting', SetGreetingService._SetGreeting);
// 設定第一次點擊開始使用後的問候語
router.post('/SetWelcomeAbroad', SetGreetingService._SetWelcomeAbroad);
// 設定互動引導文字
router.post('/SetGuideHint', SetGreetingService._SetGuideHint);

//// 設定智慧常駐選單區塊
// 設定小助理版智慧常駐選單
router.post('/SetPermanentMenu', SetPermanentMenuService._SetMenu);
// 設置商務版智慧常駐選單
router.post('/SetBusinessMenu', SetBusinessMenuService._SetMenu);
// 取得商務版智慧常駐選單
router.post('/GetBusinessMenu', SetBusinessMenuService._GetMenu);
// 開啟/關閉用戶對話框
router.post('/SwitchMessageInput', SetBusinessMenuService._SwitchMessageInput);

////純文字回覆區塊
// 設定純文字回覆
router.post('/SetMessageReply', SetMessageReplyService._SetMessageReply);

////新版卡片功能
// 加入卡片
router.post('/SetPayload', SetPayloadService._SetPayload);
// 更新卡片
router.post('/UpdatePayload', SetPayloadService._UpdatePayload);
// 取得卡片
router.post('/GetPayload', SetPayloadService._GetPayload);
// 移除卡片
router.post('/DeletePayload', SetPayloadService._DeletePayload);
// 取得WorkFlow(卡片排程清單)
router.post('/GetWorkFlow', SetPayloadService._GetWorkFlow);
// 移除WorkFlow
router.post('/DeleteWorkFlow', SetPayloadService._DeleteWorkFlow);
// 取得藍色選單
router.post('/GetBlueMenu', SetPayloadService._GetBlueMenu);
// 更新WorkFlow(卡片排程清單)
router.post('/UpdateWorkFlow', SetPayloadService._UpdateWorkFlow);
// 轉換Workflow格式(開發調整使用)
router.get('/TransferWorkflow', SetPayloadService._TransferWorkflow);
// API對接私訊卡片設定
router.post('/APIMessengerReply', SetPayloadService._APIMessengerReply);
// 查詢API對接私訊卡片設定
router.post('/GetAPIMessengerSetting', SetPayloadService._GetAPIMessengerSetting);

////定時服務區塊
// 每分鐘自動掃描並執行排程任務
schedule.scheduleJob({ start: new Date(Date.now()), rule: '*/1 * * * *' }, function () {
    ScheduleService._ScanMissions();
});
// 每天的早上7點到晚上11點，每小時自動掃瞄所有粉專token狀況
schedule.scheduleJob({ start: new Date(Date.now()), rule: '0 0 7-23 * * *' }, function () {
    ScheduleService._DebugAllToken();
});
// 設定新定時服務
router.post('/CreateSchedule', ScheduleService._CreateSchedule);
// 取得定時服務
router.post('/GetScheduleList', ScheduleService._GetScheduleList);
// 變更定時服務
router.post('/UpdateSchedule', ScheduleService._UpdateSchedule);
// 移除定時服務
router.post('/DeleteSchedule', ScheduleService._DeleteSchedule);
// 檢查單一粉專Token
router.post('/DebugPageToken', ScheduleService._DebugPageToken);
// 檢查所有粉專Token
router.get('/DebugToken', ScheduleService._DebugAllTokenAPI);

////留言區塊
// 設定留言關鍵字回覆
router.post('/SetKeywordsPrivateReply', CommentService._SetKeywordsPrivateReply);
// 初始化設定單一文章所有關鍵字設定
router.post('/CreateKeywordsSetting', CommentService._CreateKeywordsSetting);
// 取得單一文章所有關鍵字設定
router.post('/GetKeywordsSetting', CommentService._GetKeywordsSetting);
// 更新單一文章所有關鍵字設定
router.post('/UpdateKeywordsSetting', CommentService._UpdateKeywordsSetting);
// 開關留言模組
router.post('/SetKeywordsStatus', CommentService._SetKeywordsStatus);
// 開關私訊扣點數功能
router.post('/SetFreeMessageStatus', CommentService._SetFreeMessageStatus);
// 取得粉專文章
router.post('/GetPosts', CommentService._GetPosts);
// API對接留言回覆設定
router.post('/APICommentReply', CommentService._APICommentReply);
// 取得API對接留言回覆設定
router.post('/GetAPICommentSetting', CommentService._GetAPICommentSetting);

////標籤PSID區塊
// 新增標籤
router.post('/CreateTag', TagService._CreateTag);
// 移除標籤
router.post('/RemoveTag', TagService._RemoveTag);
// 讀取標籤
router.post('/ReadTag', TagService._ReadTag);
// 加入黑名單標籤
router.post('/AddBlackListTag', TagService._AddBlackListTag);
// 更新標籤統計人數
router.post('/AddTagUserCount', TagService._AddTagUserCount);

////粉專管理員區塊
//取得FB粉專所有管理員, 小編資訊
router.post('/GetPageRoles', PageAdminService._GetPageRoles);
//取得粉專目前主管理員, 共用管理員資訊
router.post('/GetPageAdmin', PageAdminService._GetPageAdmin);
//取得主管理員目前開放共用粉專, 共用管理員資訊
router.post('/GetAdminSetting', PageAdminService._GetAdminSetting);
//設定共用管理員到特定粉專
router.post('/SetPageEditor', PageAdminService._SetPageEditor);
//移除特定粉專的共用管理員
router.post('/RemovePageEditor', PageAdminService._RemovePageEditor);
//轉換粉專主管理者
router.post('/ChangePageAdmin', PageAdminService._ChangePageAdmin);
//取得所有粉專管理者Email資訊
router.get('/GetAdminEmail', PageAdminService._GetAdminEmail);

////開發測試區塊
// 檢查粉專read_mailbox權限
router.post('/TraceMailboxRights', DevService._TraceMailboxRights);
// 搬移粉專私訊介面相關設定
router.post('/CopyPageSetting', DevService._CopyPageSetting);
// 取得用戶表單連結
router.post('/GetPagePSIDLink', DevService._GetPagePSIDLink);
// 測試Webhook卡片類Function
router.post('/TestCard', DevService._TestCard);
router.post('/TestComment', DevService._TestComment);
router.post('/TestAPICard', DevService._TestAPICard);
router.post('/TestReplyCardAPI', DevService._TestReplyCardAPI);
router.post('/TestReplyCommentAPI', DevService._TestReplyCommentAPI);
router.post('/TestCommentReply', DevService._TestCommentReply);
router.post('/TestAPI', DevService._TestAPI);
router.post('/TestAddBonus', DevService._TestAddBonus);

module.exports = router;