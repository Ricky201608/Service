var fs = require('fs');
function FileStorageProvider(path) {
	fs.exists(path, function (exists) {
		if (!exists) fs.mkdir(path);
	});

	if (path.charAt(path.length - 1) != '/') path += '/';
	this._path = path;

	this.getItem = function (key, cb) {
		fs.readFile(this._path + key, function (err, result) {
			cb(null, result);
		});
	};
	this.setItem = function (key, value, cb) {
		fs.writeFile(this._path + key, value, cb);
	};
	this.removeItem = function (key, cb) {
		fs.unlink(this._path + key, cb);
	};
	this.multiGet = function (keys, cb) {
		var results = {};
		for (var i in keys) {
			try {
				results[keys[i]] = fs.readFileSync(this._path + keys[i]);
			}catch(err){
				results[keys[i]] = undefined;
			}
		}
		cb( null, results );
	};
	this.multiSet = function (data, cb) {
		for (var k in data) {
			fs.writeFileSync(this._path + k, data[k]);
		}
		cb( null, undefined );
	};
	this.multiRemove = function (keys, cb) {
		for (var i in keys) {
			try {
				fs.unlinkSync(this._path + keys[i]);
			}catch(err){
			}
		}
		cb( null, undefined );
	};
}

module.exports = FileStorageProvider;
