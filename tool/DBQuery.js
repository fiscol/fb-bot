
// DB相關索引功能
const db = require('../db/firebase_db.js');
require('es6-promise');

// 查詢訊息是否為公版Eilis用戶
exports._EilisUserPage = function(pageID){
  return db._onValuePromise('EilisFB', pageID).then(function(pageData){
    return Promise.resolve(pageData);
  }, function (error){
    return Promise.reject(new Error('找不到專頁資訊 + 錯誤原因:' + error));
  })
}

