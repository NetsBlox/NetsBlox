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
	getActions: () => ['apod', 'apodMedia', 'latestMarsWeather'], // list of available functions for client to use

	// NASA's 'Astronomy Picture of the Day'
	apod: function(req, res) {
		// to return
		var results = [];

		request(APOD_URL, function(err, response, body) {
			body = JSON.parse(body);
			results.push('Date: ' + body.date);
			results.push('Title: ' + body.title);
			results.push('URL: ' + body.url);
			results.push('Description:');
			var description = body.explanation.match(/.{1,70}/g) || [];
			for (var i = 0; i < description.length; i++) {
				results.push(description[i]);
			}
			return res.json(results);
		});
	},

	// NASA's 'Astronomy Picture of the Day' media
	apodMedia: function(req, res) {

		request(APOD_URL, function(err, response, body) {
			body = JSON.parse(body);
			trace(body.url);
			request.get('http://apod.nasa.gov/apod/image/1607/PIA20701_fig1JupiterJuno.jpg').pipe(res);
		})

	},

	// latest weather on Mars according to the MAAS API
	latestMarsWeather: function(req, res) {
		// to return
		var results = [];

		request(MARS_URL, function(err, response, body) {
			body = JSON.parse(body);
			results.push('Date on Earth: ' + body.report.terrestrial_date);
			results.push('Curiousity Rover sols spent on Mars: ' + body.report.sol);
			results.push('Low of (F): ' + body.report.min_temp_fahrenheit);
			results.push('High of (F): ' + body.report.max_temp_fahrenheit);
			results.push('Weather is: ' + body.report.atmo_opacity);
			return res.json(results);
		});
	}

};
