'use strict';

var FileStorageProvider = require('./providers/FileStorageProvider');

var s = require('../src');
s.setStorageProvider(new FileStorageProvider('/tmp/file_storage'), true);
s.setStoragePrefix('ai_');
var data = {};

s.register('test', require('./actions/TestActions'));
s.bind('userId', data);
s.bind(['userId', 'aaa', 'bbb'], (key,value)=> {
	console.log('bind '+key+': ' + value);
});

s.call('test.login', {userId: 12334567890, password: 'abc111'}).then(()=> {
	console.log(data);
	return s.call('test.login', {userId: '12334567890', password: 123456});
}).then(()=> {
	console.log(data);
}).catch((err)=> {
	console.error(err);
});
