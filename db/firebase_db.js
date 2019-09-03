// Firebase realtime database
require('es6-promise');

// 20170328 更新Firebase
var firebase = require("firebase-admin");
var serviceAccount = require("./firebaseConfig.json");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "*",
  databaseAuthVariableOverride: {
    uid: "*"
  }
});
/*
	.Write
*/
var db = firebase.database();

// set
exports._set = function (_Path, _ChildName, _Value) {
    var ref = db.ref(_Path);
    // console.log('ref.set ' + _Value);
    return new Promise((resolve, reject) => {
        ref.child(_ChildName).set(_Value).then(function () {
            // console.log("Data set successfully.");
            return resolve("Set succeed.");
        }).catch(function (err) {
            console.log("Data could not be set." + err);
            return reject("Set error:" + err);
        });
    });
};

// update
exports._update = function (_Path, _ChildName, _Value) {
    var ref = db.ref(_Path);
    // console.log('ref.update ' + _Value);
    return new Promise((resolve, reject) => {
        ref.child(_ChildName).update(_Value).then(function () {
            // console.log("Data updated successfully.");
            return resolve("Update succeed.");
        }).catch(function (err) {
            console.log("Data could not be updated." + err);
            return reject("Update error:" + err);
        });
    });
};

// push
exports._push = function (_Path, _ChildName, _Value) {
    var ref = db.ref(_Path);
    // console.log('ref.push ' + _Value);
    return new Promise((resolve, reject) => {
        ref.child(_ChildName).push(_Value).then(function (snapshot) {
            // console.log("Data pushed successfully.");
            const key = snapshot.key;
            return resolve(key);
        }).catch(function (err) {
            console.log("Data could not be pushed." + err);
            return reject("Push error:" + err);
        });
    });
};

// add number with transaction
exports._transactionCount = function (_Path, _AddCount, _Callback) {
    var ref = db.ref(_Path);
    return ref.transaction(function (currentRank) {
        // If _Path has never been set, currentRank will be `null`.
        return Number(currentRank) + _AddCount;
    }).then(function (_Count) {
        return Promise.resolve(_Callback(_Count));
    });
};

// remove
exports._remove = function (_Path, _Callback) {
    var ref = db.ref(_Path);
    return ref.remove()
        .then(function () {
            // console.log("Remove succeeded.");
            return Promise.resolve("Remove succeeded.");
        })
        .catch(function (err) {
            console.log("Remove failed: " + err);
            return Promise.reject("Remove failed.");
        });
}

/*
	.Read
*/
// Read database with Promise
exports._onValuePromise = function (_Path, _ChildName) {
    var ref = db.ref(_Path);
    return ref.child(_ChildName).once("value").then(function (snapshot) {
        // console.log('snapshot.val(): '+ JSON.stringify(snapshot.val()));
        return snapshot.val();
    }, function (error) {
        console.log('error' + error);
        return error
    })
};

exports._onValuePromiseWithoutChild = function (_Path) {
    var ref = db.ref(_Path);
    return ref.once("value").then(function (snapshot) {
        // console.log('snapshot.val(): '+ JSON.stringify(snapshot.val()));
        return snapshot.val();
    }, function (error) {
        console.log('error' + error);
        return error
    })
};

// equalTo
exports._equalTo = function (_Path, _ChildName, _Value, error) {
    var ref = db.ref(_Path);
    return ref.orderByChild(_ChildName).equalTo(_Value).once("value").then(function (snapshot) {
        return snapshot.val();
    }, function (error) {
        return error;
    });
}
