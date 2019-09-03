// // Show Time Now
const time = require('time'); 

module.exports = {
  // 2017/03/30 22:35:12
  TimeNow: function(){
    var now = new time.Date();
    now.setTimezone("Asia/Taipei");
    var TimeSplit = now.toString().split(" ");
    var Month = monthTrans(TimeSplit[1]);
    var TimeOutput = TimeSplit[3] + '/' + Month + '/' + TimeSplit[2] + ' ' + TimeSplit[4];
    return TimeOutput.toString();
  },

  // 2017/03/30
  DateNow : function(){
    var now = new time.Date();
    now.setTimezone("Asia/Taipei");
    var TimeSplit = now.toString().split(" ");
    var Month = monthTrans(TimeSplit[1]);
    var DateOutput = TimeSplit[3] + '/' + Month + '/' + TimeSplit[2];
    return DateOutput.toString();
  },

  // 2017-03-30
  DateNowDBChild : function(){
    var now = new time.Date();
    now.setTimezone("Asia/Taipei");
    var TimeSplit = now.toString().split(" ");
    var Month = monthTrans(TimeSplit[1]);
    var DateDBChildOutput = TimeSplit[3] + '-' + Month + '-' + TimeSplit[2];
    return DateDBChildOutput.toString();
  },
  
}


// Month transform
function monthTrans(Month){
  var MonthNum;
  switch(Month){
    case 'Jan':
      MonthNum = '01';
      break;
    case 'Feb':
      MonthNum = '02';
      break;
    case 'Mar':
      MonthNum = '03';
      break;
    case 'Apr':
      MonthNum = '04';
      break;
    case 'May':
      MonthNum = '05';
      break;
    case 'Jun':
      MonthNum = '06';
      break;
    case 'Jul':
      MonthNum = '07';
      break;
    case 'Aug':
      MonthNum = '08';
      break;
    case 'Sep':
      MonthNum = '09';
      break;
    case 'Oct':
      MonthNum = '10';
      break;
    case 'Nov':
      MonthNum = '11';
      break;
    case 'Dec':
      MonthNum = '12';
      break;
  }
  return MonthNum;
}