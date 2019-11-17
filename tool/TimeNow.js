// // Show Time Now
const time = require('dateformat'); 

module.exports = {
  // 2017/03/30 22:35:12
  TimeNow: function(){
    return time(new Date(), "yyyy/mm/dd HH:MM:ss");
  },

  // 2017/03/30
  DateNow : function(){
    return time(new Date(), "yyyy/mm/dd");
  },

  // 2017-03-30
  DateNowDBChild : function(){
    return time(new Date(), "yyyy-mm-dd");
  },
}
