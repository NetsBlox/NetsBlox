// This will use the Twitter API to allow the client to execute certain Twitter functions
// within NetsBlox

'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:Twitter:log'),
    error = debug('NetsBlox:RPCManager:Twitter:error'),
    trace = debug('NetsBlox:RPCManager:Twitter:trace'),
    request = require('request'),
    baseURL = 'https://api.twitter.com/1.1/',
    KEY = process.env.TWITTER_BEARER_TOKEN;

var options = {
	url: baseURL,
	headers: { 
		'Authorization': KEY,
		'gzip': true
		},
};

module.exports = {

	isStateless: true,
	getPath: () => '/Twitter',
	getActions: () => ['RecentTweets', 'Followers', 'Tweets'], // list of available functions for client to use

	// returns a list of a user's recent tweets
	RecentTweets: function(req, res) {

		var results = [];
		// gather parameters
		options.url = baseURL + 'statuses/user_timeline.json?';
		var screenName = req.query.screenName;
		var count = req.query.count;

		// ensure valid parameters
		if (screenName == '' || screenName == undefined || count == 0 || count == undefined) {
			trace('Enter valid paramters...');
			return res.send(false);
		}

		if (count > 100) {
			count = 100;
		}

		options.url = options.url + 'screen_name=' + screenName + '&count=' + count;

		request(options, function(err, response, body) {
			body = JSON.parse(body);
			for (var i = 0; i < body.length; i++) {
				results.push(body[i].text);
			}
			return res.json(results);
		});

	},

	// returns amount of followers a user has
	Followers: function(req, res) {

		// gather parameters
		options.url = baseURL + 'users/lookup.json?';
		var screenName = req.query.screenName;

		// ensure valid paramters
		if (screenName == '' || screenName == undefined) {
			trace('Enter a valid screen name...');
			return res.send(false);
		}

		options.url = options.url + 'screen_name=' + screenName;

		request(options, function(err, response, body) {
			body = JSON.parse(body);
			return res.json(body[0].followers_count);
		});
	},

	// returns amount of tweets a user has
	Tweets: function(req, res) {

		// gather parameters
		options.url = baseURL + 'users/lookup.json?';
		var screenName = req.query.screenName;

		// ensure valid paramters
		if (screenName == '' || screenName == undefined) {
			trace('Enter a valid screen name...');
			return res.send(false);
		}

		options.url = options.url + 'screen_name=' + screenName;

		request(options, function(err, response, body) {
			body = JSON.parse(body);
			return res.json(body[0].statuses_count);
		});
	}

};