var FileStorageProvider = require('./providers/FileStorageProvider');

function check( service, prefix ) {
	service.save('aaa', [111, '222', {cc: 33, dd: false}])
		.then(function () {
			console.log(prefix+'	set1	ok');
			return service.save({bbb:false,ccc:123,ddd:'xxx'});
		})
		.then(function () {
			console.log(prefix+'	set2	ok');
			return service.load('aaa');
		})
		.then(function (result) {
			console.log(prefix+'	get1	' + (result[0]==111?'ok':'failed'));
			return service.load('bbb');
		})
		.then(function (result) {
			console.log(prefix+'	get2	' + (result===false?'ok':'failed'));
			return service.load(['aaa','bbb','ccc']);
		})
		.then(function (result) {
			console.log(prefix+'	get all	'+ (result['aaa'][0]==111&&result['ccc']===123?'ok':'failed'));
			return service.remove('aaa');
		})
		.then(function () {
			console.log(prefix+'	remove1	ok');
			return service.remove(['aaa','bbb']);
		})
		.then(function () {
			console.log(prefix+'	remove2	ok');
			return service.load(['aaa','bbb','ccc']);
		})
		.then(function (result) {
			console.log(prefix+'	get all	' + (result['aaa']===undefined&&result['ccc']===123?'ok':'failed'));
			console.log('============ ALL OK ============');
		})
		.catch(function (err) {
			console.log(err);
			console.log('============ ERROR ============');
		});
}

var service1 = require('../src').new();
check( service1, 'Memory' );

var service2 = require('../src').new();
service2.setStorageProvider(new FileStorageProvider('/tmp/file_storage'), true);
service2.setStoragePrefix('ai_');
check( service2, 'File' );
