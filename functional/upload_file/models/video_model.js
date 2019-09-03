var db = require('../../../db/firebase_db.js');
var storageConfig = require('../../../config/firebase_storage.js');
const gcs = require('@google-cloud/storage')({
    projectId: storageConfig.projectId,
    keyFilename: './db/firebaseConfig.json'
});
const bucketName = storageConfig.bucketName;
const bucket = gcs.bucket(bucketName);
var mime = require('mime');
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');

var Video = function (reqData) {
    // create an incoming form object
    this.uploadVideo = function () {
        return new Promise(function (resolve, reject) {
            var form = new formidable.IncomingForm();
            var folderName = "";
            var fbPageID = "";
            // specify that we want to allow the user to upload multiple files in a single request
            form.multiples = false;

            form.on('field', function (name, value) {
                if (name == "PageID") {
                    fbPageID = value;
                    folderName = value + "/Videos";
                }
            });
            // form.on('progress', function (bytesReceived, bytesExpected) {
            //     if (bytesReceived > 3 * 1024 * 1024) {
            //         return reject('您上傳的檔案大小超過限制囉, 請上傳3MB內的影音檔案');
            //     }
            // });
            form.on('file', function (name, file) {
                //fs.rename(file.path, path.join(form.uploadDir, file.name));
                fs.readFile(file.path, function (err, contents) {
                    if (err) {
                        res.json({ 'Error': err });
                    }
                    const filePath = file.path;
                    const uploadTo = path.join(folderName, file.name);
                    const fileMime = file.type;


                    return bucket.upload(filePath, {
                        destination: uploadTo,
                        public: true,
                        metadata: { contentType: fileMime, cacheControl: "public, max-age=300" }
                    }, function (err, file) {
                        if (err) {
                            return reject(err);
                        }
                        return resolve({
                            "Link": createPublicFileURL(uploadTo),
                            "PageID": fbPageID
                        });
                    });


                    function createPublicFileURL(storageName) {
                        return `http://storage.googleapis.com/${bucketName}/${encodeURIComponent(storageName)}`;
                    }
                });
            });
            // log any errors that occur
            form.on('error', function (err) {
                return reject(err);
            });
            // parse the incoming request containing the form data
            form.parse(reqData);
        })
    }
}


module.exports = Video;