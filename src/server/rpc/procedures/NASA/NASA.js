// This will utilize NASA's public APIs in order to provide data to the client

'use strict';

var debug = require('debug'),
	log = debug('NetsBlox:RPCManager:NASA:log'),
	error = debug('NetsBlox:RPCManager:NASA:error'),
	trace = debug('NetsBlox:RPCManager:NASA:trace'),
	request = require('request'),
	KEY = process.env.NASA_KEY,
	APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=' + KEY,
	MARS_URL = 'http://marsweather.ingenology.com/v1/latest/';

module.exports = {

	isStateless: true,
	getPath: () => '/NASA',
	getActions: () => ['apod', 'apodMedia', 'marsHighTemp', 'marsLowTemp', 'marsWeather'], // list of available functions for client to use

	// NASA's 'Astronomy Picture of the Day'
	apod: function(req, res) {
		request(APOD_URL, function(err, response, body) {
			body = JSON.parse(body);
			var msg = {
				type: 'message',
				msgType: 'Astronomy Pic of the Day',
				dstId: req.netsbloxSocket.roleId,
				content: {
					date: body.date,
					title: body.title,
					link: body.url,
					description: body.explanation
				}
			};
			req.netsbloxSocket.send(msg);
			return res.json(true);
		});
	},

	// NASA's 'Astronomy Picture of the Day' media
	apodMedia: function(req, res) {
		request(APOD_URL, function(err, response, body) {
			body = JSON.parse(body);
			request.get(body.url).pipe(res);
		});
	},

	// Latest Mars data according to MAAS
	marsHighTemp: function(req, res) {
		request(MARS_URL, function(err, response, body) {
			body = JSON.parse(body);
			return res.json(body.report.max_temp_fahrenheit);
		});
	},

	marsLowTemp: function(req, res) {
		request(MARS_URL, function(err, response, body) {
			body = JSON.parse(body);
			return res.json(body.report.min_temp_fahrenheit);
		});
	},

	marsWeather: function(req, res) {
		request(MARS_URL, function(err, response, body) {
			body = JSON.parse(body);
			return res.json(body.report.atmo_opacity);
		});
	}

};