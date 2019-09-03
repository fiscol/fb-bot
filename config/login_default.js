
var config = { };

// should end in /
config.rootUrl  = process.env.ROOT_URL                  || 'https://api.eilis-ai.com/';

config.facebook = {
    appId:          process.env.FACEBOOK_APPID          || '*',
    appSecret:      process.env.FACEBOOK_APPSECRET      || '*',
    appNamespace:   process.env.FACEBOOK_APPNAMESPACE   || '*',
    redirectUri:    process.env.FACEBOOK_REDIRECTURI    ||  config.rootUrl + 'functional/SaveUserFBDetail'
};

module.exports = config;
