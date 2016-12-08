module.exports = {

	_init: ({service, resolve, reject})=> {
		console.log('===== init =====');
		service.loadState(['userId','aaa'], resolve, reject);
	},

	_login: {
		userId: ['int', '^1\\d{10}$'],
		password: ['string', (value)=> {
			return value.length >= 6;
		}],
	},
	login: function ({service, resolve, reject}, {userId, password}) {
		console.log('===== login =====');
		service.saveState('userId', userId, resolve, reject);
	},

	isLogined: function (service, resolve, reject) {
		resolve(service.state.userId ? true : false);
	},

};
