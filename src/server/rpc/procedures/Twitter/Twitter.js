// This will use the Twitter API to allow the client to execute certain Twitter functions
// within NetsBlox

'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:Twitter:log'),
    error = debug('NetsBlox:RPCManager:Twitter:error'),
    trace = debug('NetsBlox:RPCManager:Twitter:trace'),
    request = require('request');

var KEY = 'DBGQS2z2WYK33UDZO3s2SL9eA:ocixg0lR1TODSHPMoEZXm10zs8wrW9Pi3IY0ZL9Txd5G6npra8';

var options = {
	url: 'https://api.twitter.com/oauth2/token',
	headers: [
		{name: 'User-Agent', value: 'NetsBlox'},
		{name: 'Authorization', value: 'Basic REJHUVMyejJXWUszM1VEWk8zczJTTDllQTpvY2l4ZzBsUjFUT0RTSFBNb0VaWG0xMHpzOHdyVzlQaTNJWTBaTDlUeGQ1RzZucHJhOA=='},
		{name: 'Content-Type', value: 'application/x-www-form-urlencoded;charset=UTF-8'},
		{name: 'Content-Length', value: 29},
		{name: 'Accept-Encoding', value: 'gzip'}
		],
	body: 'grant_type=client_credentials'
};

module.exports = {

	isStateless: true,
	getPath: () => '/Twitter',
	getActions: () => ['Tweet', 'RecentTweets'], // list of available functions for client to use

	Tweet: function(req, res) {
		request.post(options, function(err, response, body) {
			trace(body);
		});
	},

	RecentTweets: function(req, res) {

	}

};