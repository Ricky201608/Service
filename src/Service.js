'use strict';

var Storage = require('./Storage');

function _noticeBind(service, key, value) {
	if (!service._binds[key]) return;
	for (var i in service._binds[key]) {
		var target = service._binds[key][i];
		if (typeof target == 'function') {
			target.call(null, key, value);
		} else if (target instanceof Array && target.length == 2) {
			if (typeof target[1] == 'function') {
				target.call(target[0], key, value);
			} else {
				target[0][target[1]] = value;
			}
		} else {
			target[key] = value;
		}
	}
}

var _check_regex_cache = {};
function _check(value, regex) {
	var str_value = _cast('string', value);
	if (!_check_regex_cache[regex]) _check_regex_cache[regex] = new RegExp(regex);
	return str_value.match(_check_regex_cache[regex]) !== null;
}

function _cast(type, value) {
	var src_type = typeof value;
	switch (type) {
		case 'int':
			if (src_type == 'boolean') return value ? 1 : 0;
			if (!value) return 0;
			return parseInt(value);
		case 'float':
			if (src_type == 'boolean') return value ? 1.0 : 0.0;
			if (!value) return 0.0;
			return parseFloat(value);
		case 'boolean':
			if (src_type == 'string') return value == '0' || value == '' || value.toLowerCase() == 'false' ? false : true;
			return value ? true : false;
		case 'string':
			if (src_type == 'string') return value;
			if (!value) return '';
			return value + '';
	}
	return value;
}

function _callAction(action_name, action_method_name, action_object, service_args, action_args) {
	// check args and auto cast
	var checks = action_object['_' + action_method_name];
	if (checks) {
		for (var k in checks) {
			if (checks[k] && checks[k].length) {
				action_args[k] = _cast(checks[k][0], action_args[k]);
				if (checks[k].length > 1) {
					var check_ok = true;
					if (typeof checks[k][1] == 'function') {
						if (!checks[k][1].call(null, action_args[k])) check_ok = false;
					} else {
						if (!_check(action_args[k], checks[k][1])) check_ok = false;
					}
					if (!check_ok) throw new Error('Arg ' + k + ' [' + action_args[k] + '] check failed with ' + checks[k][1] + ' on Action ' + action_name + '.' + action_method_name);
				}
			}
		}
	}
	action_object[action_method_name].call(action_object, service_args, action_args);
}

function _setState(service, key, value) {
	if (typeof key == 'string') {
		service.state[key] = value;
		_noticeBind(service, key, value);
	} else {
		for (var k in key) {
			service.state[k] = key[k];
			_noticeBind(service, k, key[k]);
		}
	}
}

function _saveState(service, key, value, resolve, reject) {
	service.save(key, value).then(()=> {
		_setState(service, key, value);
		resolve();
	}).catch(function (err) {
		reject(err);
	});
}
function _loadState(service, key, resolve, reject) {
	service.load(key).then((value)=> {
		if (typeof key == 'string') {
			_setState(service, key, value);
		}else{
			_setState(service, value, null);
		}
		resolve();
	}).catch(function (err) {
		reject(err);
	});
}

function _call(service, name, action_args) {
	return new Promise(function (resolve, reject) {

		if (!action_args) action_args = {};
		var last_p = name.lastIndexOf('.');
		if (last_p < 0) return reject(new Error('Action ' + name + ' is not exists'));
		var action_name = name.substr(0, last_p);
		var action_method_name = name.substr(last_p + 1);
		var action_object = service._actions[action_name];
		if (action_method_name.charAt(0) == '_') return reject(new Error('Method ' + action_method_name + ' on Action ' + action_name + ' is private'));
		if (!action_object) return reject(new Error('Action ' + action_name + ' is not exists when called ' + action_method_name));
		if (!action_object[action_method_name]) return reject(new Error('Action ' + action_name + ' method ' + action_method_name + ' is not exists'));

		var service_args = {service: service, resolve: resolve, reject: reject};

		// init
		if (action_object['_init']) {
			if (!action_object['_is_inited']) {
				var init_args = {service: service, reject: reject};
				init_args.resolve = ()=> {
					action_object['_is_inited'] = true;
					_callAction(action_name, action_method_name, action_object, service_args, action_args);
				};
				return action_object['_init'].call(action_object, init_args);
			}
		}

		_callAction(action_name, action_method_name, action_object, service_args, action_args);
	});
}

// -------------------------- Service --------------------------

function Service() {
	this._storage = new Storage();
	this._actions = {};
	this._binds = {};
	this.state = {};
}

// ------------- for storage -------------

Service.prototype.setStorageProvider = function (provider, is_async) {
	this._storage.setProvider(provider, is_async);
};

Service.prototype.setStoragePrefix = function (prefix) {
	this._storage.setPrefix(prefix);
};

Service.prototype.load = function (key) {
	return this._storage.getItem(key);
};

Service.prototype.save = function (key, value) {
	return this._storage.setItem(key, value);
};

Service.prototype.remove = function (key) {
	return this._storage.removeItem(key);
};

// ------------- for state -------------

Service.prototype.bind = function (key, target) {
	if (!( key instanceof Array)) key = [key];
	for (var i in key) {
		if (!this._binds[key[i]]) this._binds[key[i]] = [];
		this._binds[key[i]].push(target);
	}
};

Service.prototype.unbind = function (key, target) {
	if (!(key instanceof Array)) key = [key];
	for (var i in key) {
		if (this._binds[key[i]]) {
			var pos = this._binds[key[i]].indexOf(target);
			if (pos >= 0) {
				this._binds[key[i]].splice(pos, 1);
			}
		}
	}
};

Service.prototype.setState = function (key, value) {
	_setState(this, key, value);
};

Service.prototype.loadState = function (key, resolve, reject) {
	if( resolve ) return _loadState( this, key, resolve, reject );
	var service = this;
	return new Promise( (resolve, reject)=>{
		_loadState( service, key, resolve, reject );
	} );
};

Service.prototype.saveState = function (key, value, resolve, reject) {
	if (resolve) return _saveState(this, key, value, resolve, reject);
	var service = this;
	return new Promise((resolve, reject)=> {
		_saveState(service, key, value, resolve, reject);
	});
};

// ------------- for action -------------

Service.prototype.register = function (name, action) {
	this._actions[name] = action;
};

Service.prototype.unregister = function (name, action) {
	delete this._actions[name];
};

Service.prototype.call = function (name, action_args) {
	return _call(this, name, action_args);
};

module.exports = Service;
