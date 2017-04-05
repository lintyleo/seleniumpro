var EXPORTED_SYMBOLS = ['hashModule'];

var hash = {};

var hashModule = {
	add: function(key, value) {
		dump('Add key: ' + key + '\n');
		hash[key] = value;
	}, 

	remove: function(key) {
		dump('Remove key: ' + key + '\n');
		delete hash[key];
	},
	
	contains: function(key) {
		return typeof hash[key] != 'undefined';
	},
	
	getHashObject: function() {
		return hash;
	}
};
