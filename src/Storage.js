'use strict';

// a stroage from memory
function _MemoryStorage() {
	this.data = {};
	this.getItem = function (key) {
		return this.data[key];
	};
	this.setItem = function (key, value) {
		this.data[key] = value;
	};
	this.removeItem = function (key) {
		delete this.data[key];
	};
}

function _makePromise(storage, method, args) {
	if (!storage._provider) storage._provider = new _MemoryStorage();
	if (typeof args[0] != 'object') {
		args[0] = storage._prefix + args[0];
	} else if (storage._isAsync) {
		method = ( method == 'removeItem' ? 'multiRemove' : (method == 'setItem' ? 'multiSet' : 'multiGet') );
	}
	return new Promise(function (resolve, reject) {
		if (!storage._provider[method]) return reject(new Error('Storage Provider method ' + method + ' is not exists'));
		if (storage._isAsync) {

			if (method == 'setItem') {
				args[1] = JSON.stringify(args[1]);
			}else if (method == 'multiSet') {
				var data = {};
				for (var k in args[0]) {
					data[storage._prefix+k] = JSON.stringify(args[0][k]);
				}
				args = [data];
			}else if (method == 'multiGet' || method == 'multiRemove') {
				var new_keys = [];
				for (var i in args[0]) {
					new_keys[i] = storage._prefix+args[0][i];
				}
				args[0] = new_keys;
			}

			args.push(function (err, result) {
				if (err) {
					reject(err);
				} else {
					if (method == 'getItem' && result) {
						result = JSON.parse(result);
					} else if (method == 'multiGet') {
						var data = {};
						for (var k in result) {
							if (result[k])result[k] = JSON.parse(result[k]);
							data[ k.substr(storage._prefix.length) ] = result[k];
						}
						result = data;
					}
					resolve(result);
				}
			});
			storage._provider[method].apply(storage._provider, args);
		} else {
			if (typeof args[0] == 'string') {
				if (method == 'setItem') {
					args[1] = JSON.stringify(args[1]);
				}
				var result = storage._provider[method].apply(storage._provider, args);
				resolve(method == 'getItem' && result ? JSON.parse(result) : result);
			} else {
				if (method == 'getItem') {
					var results = {};
					for (var k in args[0]) {
						results[args[0][k]] = storage._provider[method].apply(storage._provider, [storage._prefix + args[0][k]]);
						if (results[args[0][k]]) results[args[0][k]] = JSON.parse(results[args[0][k]]);
					}
					resolve(results);
				} else {
					var results = true;
					for (var k in args[0]) {
						results = storage._provider[method].apply(storage._provider, method == 'setItem' ? [storage._prefix + k, args[0][k]] : [storage._prefix + args[0][k]]);
					}
					resolve(results);
				}
			}
		}
	});
}

function Storage() {
	this._provider = null;
	this._prefix = '';
	this._isAsync = false;
}

Storage.prototype.setPrefix = function (prefix) {
	this._prefix = prefix;
};

Storage.prototype.setProvider = function (provider, is_async) {
	if (this._provider) {
		console.error("Storage Provider can't set repeated");
		return;
	}
	this._isAsync = is_async ? true : false;
	this._provider = provider;
};


Storage.prototype.getItem = function (key) {
	return _makePromise(this, 'getItem', [key]);
};

Storage.prototype.setItem = function (key, value) {
	return _makePromise(this, 'setItem', [key, value]);
};

Storage.prototype.removeItem = function (key) {
	return _makePromise(this, 'removeItem', [key]);
};

module.exports = Storage;
