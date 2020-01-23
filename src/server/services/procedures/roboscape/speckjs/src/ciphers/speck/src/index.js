var versions = require('./versions')

versions.forEach(function (v) {
	try {
    	exports[v] = require('./' + v);
    } catch (e) {}
})
