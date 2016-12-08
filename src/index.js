var Service = require( './Service' );
var s = new Service();
s.new = function () {
	return new Service();
};

module.exports = s;
