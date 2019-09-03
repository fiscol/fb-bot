const express = require('express');
const router = express.Router();

//// 上傳功能相關區塊
// 上傳功能的前端測試頁面
router.get('/upload', function (req, res, next) {
    res.render('DevViews/upload_file_test', { title: '檔案上傳DEMO PAGE' });
});

// 上傳功能的前端測試頁面
router.get('/uploadimage', function (req, res, next) {
    res.render('DevViews/upload_img_test', { title: '圖片上傳DEMO PAGE' });
});

//// 金流相關區塊
// 智付通一次性支付的前端頁面
router.get('/oncepay', function (req, res, next) {
    res.render('once_pay_page.ejs', { title: '請稍候，為您跳轉智付通串接Eilis單次付款頁面...' });
});

// 智付通授權定期定額的前端頁面
router.get('/periodpay', function (req, res, next) {
    res.render('period_pay_page.ejs', { title: '請稍候，為您跳轉智付通串接Eilis定期定額付款頁面...' });
});

// 智付寶發票的前端測試頁面
// router.get('/receipt', function (req, res, next) {
//     res.render('DevViews/receipt_test.ejs', { title: '智付通串接DEMO PAGE' });
// });

// Tappay金流的前端測試頁面
// router.get('/payment', function (req, res, next) {
//     res.render('DevViews/payment_test', { title: 'Tappay串接DEMO PAGE' });
// });

//// 註冊系統相關區塊
// FITI優惠60天註冊頁面
router.get('/FITI-Bonus-Page', function (req, res, next) {
    res.render('fiti_bonus_page', { loginUrl: 'https://api.eilis-ai.com/functional/loginEilis?Redirect=http://mobile-beta.eilis-ai.com/gotpages&BonusCode=FITI0819' });
});

// 生洋廣告優惠45天註冊頁面
router.get('/SAYA-Bonus-Page', function (req, res, next) {
    res.render('saya_bonus_page', { loginUrl: 'https://api.eilis-ai.com/functional/loginEilis?Redirect=http://mobile-beta.eilis-ai.com/gotpages&BonusCode=SayaClients' });
});

// EILIS優惠45天註冊頁面
router.get('/EILIS-Special-Bonus-Page', function (req, res, next) {
    res.render('eilis_special_bonus_page', { loginUrl: 'https://api.eilis-ai.com/functional/loginEilis?Redirect=http://mobile-beta.eilis-ai.com/gotpages&BonusCode=EilisSpecialCode' });
});

//// 申請FB APP權限DEMO影片相關區塊
// FB轉跳留言回覆頁面
router.get('/Reply-Index-Demo', function (req, res, next) {
    res.render('DevViews/reply_index_demo');
});

// 留言回覆頁面
router.get('/Reply-Demo', function (req, res, next) {
    res.render('DevViews/reply_demo');
});

// 讀取粉專信箱轉跳頁面
router.get('/Inbox-Index-Demo', function (req, res, next) {
    res.render('DevViews/inbox_index_demo');
});

// 讀取粉專信箱頁面
router.get('/Inbox-Demo', function (req, res, next) {
    res.render('DevViews/message_inbox');
});

// 桌面版的請互動用戶登入取得email
router.get('/Desktop-Login', function (req, res, next) {
    res.render('desktop_login');
});

module.exports = router;