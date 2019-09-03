// 正式版組態
var config = {
    //單筆支付
    OnceStoreMerchantID: '*',
    OnceStoreHashKey: '*',
    OnceStoreHashIV: '*',
    OncePayRedirectUri: 'https://api.eilis-ai.com/functional/SmartPaySucceed',
    OncePaySucceedUri: 'http://business.eilis-ai.com/adminpage?Status=OncePayOK',
    OncePaySubmitUri: 'https://core.spgateway.com/MPG/mpg_gateway',
    OncePaySucceedReferrer: 'https://core.spgateway.com/MPG/mpg_gateway/mpg_return_url?Status=SUCCESS',
    //定期定額支付
    PeriodStoreMerchantID: '*',
    PeriodStoreHashKey: '*',
    PeriodStoreHashIV: '*',
    PeriodPayRedirectUri: 'https://api.eilis-ai.com/functional/SmartPayPeriodSucceed',
    PeriodPaySucceedUri: 'http://business.eilis-ai.com/adminpage?Status=PeriodPayOK',
    PeriodPaySubmitUri: 'https://core.spgateway.com/MPG/period',
    PeriodPaySucceedReferrer: 'https://core.spgateway.com/MPG/period/paypage_submit',
    PeriodPayNotifyUri: 'https://api.eilis-ai.com/functional/SmartPayPeriodNotify',
    BackUri: '',
    CancelPaySubmitUri: 'https://core.spgateway.com/API/CreditCard/Cancel'
};

// 測試版組態
// var config = {
//     OnceStoreMerchantID: '*',
//     OnceStoreHashKey: '*',
//     OnceStoreHashIV: '*',
//     OncePayRedirectUri: 'https://api.eilis-ai.com/functional/SmartPaySucceed',
//     OncePaySucceedUri: 'http://business.eilis-ai.com/adminpage?Status=OncePayOK',
//     OncePaySubmitUri: 'https://ccore.spgateway.com/MPG/mpg_gateway',
//     OncePaySucceedReferrer: 'https://ccore.spgateway.com/MPG/mpg_gateway/mpg_return_url?Status=SUCCESS',
//     PeriodStoreMerchantID: '*',
//     PeriodStoreHashKey: '*',
//     PeriodStoreHashIV: '*',
//     PeriodPayRedirectUri: 'https://api.eilis-ai.com/functional/SmartPayPeriodSucceed',
//     PeriodPaySucceedUri: 'http://business.eilis-ai.com/adminpage?Status=PeriodPayOK',
//     PeriodPaySubmitUri: 'https://ccore.spgateway.com/MPG/period',
//     PeriodPaySucceedReferrer: 'https://ccore.spgateway.com/MPG/period/paypage_submit',
//     PeriodPayNotifyUri: 'https://api.eilis-ai.com/functional/SmartPayPeriodNotify',
//     BackUri: '',
//     CancelPaySubmitUri: 'https://ccore.spgateway.com/API/CreditCard/Cancel'
// };

module.exports = config;
