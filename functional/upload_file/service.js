//Models
var Photo = require('./models/photo_model.js');
var Video = require('./models/video_model.js');

//公版上傳圖片功能
exports._UploadImage = function (req, res) {
    var photo = new Photo(req);
    photo.uploadImage().then(function (_Result) {
        res.json({ "Link": _Result.Link });
    }).catch(function (err) {
        res.json({ "Error": "上傳圖片功能出現錯誤, 原因:" + err });
    })
}

//公版上傳影片功能
exports._UploadVideo = function (req) {
    var video = new Video(req);
    video.uploadVideo().then(function (_Link) {
        res.json({ "Link": _Link });
    }).catch(function (err) {
        res.json({ "Error": "上傳影片功能出現錯誤, 原因:" + err });
    })
}