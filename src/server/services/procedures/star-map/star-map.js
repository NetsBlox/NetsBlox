/**
 * The StarMap Service provides access to astronomy data using Sloan Digital Sky Survey.
 * For more information, check out http://skyserver.sdss.org/dr14/en/home.aspx
 *
 * @service
 * @category Science
 */
'use strict';

const logger = require('../utils/logger')('star-map');
const request = require('request');
const CacheManager = require('cache-manager');
const cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity});


// Retrieving static images
var baseUrl = 'http://skyserver.sdss.org/dr13/SkyserverWS';

module.exports = {

    COMPATIBILITY: {
        path: 'sky-map'
    },

    arcHourMinSecToDeg: function(arcHour, arcMin, arcSec) {
        return 360.0 * (1.0/24.0) * ( (1.0/60.0) * ( ( (1.0/60.0) * parseFloat(arcSec)) + parseFloat(arcMin)) + parseFloat(arcHour));
    },

    findObject: function(name) {
        var rsp = this.response;
        var queryUrl = `http://skyserver.sdss.org/dr13/en/tools/Resolver.ashx?name=${name}`;

        logger.trace(`Querying object by name: ${name}`);

        request.get(queryUrl, function (err, res) {

            rsp.set('cache-control', 'private, no-store, max-age=0');

            var lines = res.body.split(/\r?\n/);

            if(lines.length < 3) {
                rsp.status(400).send('Not found.');
            } else {
                logger.trace(lines);
                var objName = lines[0].split(':')[1].trim();
                var ra = lines[1].split(':')[1].trim();
                var dec = lines[2].split(':')[1].trim();
                ra = parseFloat(ra);
                dec = parseFloat(dec);
                logger.trace(`Found ${objName} at ra=${ra} dec=${dec}`);
                rsp.status(200).json([ra, dec]);
            }
        });

        // explicitly state that we're async
        return null;
    },

    getImage: function(right_ascension, declination, arcseconds_per_pixel, options, width, height) {
        var rsp = this.response;
        var url;
        var scale = parseFloat(arcseconds_per_pixel);

        if(!width) {
            width = 480.0;
        } else {
            width = parseFloat(width);
        }

        if(!height) {
            height = 360.0;
        } else {
            height = parseFloat(height);
        }

        logger.info(`width = ${width}`);
        logger.info(`height = ${height}`);


        if(isNaN(scale) || scale>32.0 || scale < 1.0/128.0) {
            rsp.status(400).send('Error: arcseconds_per_pixel is out of range. Valid values are between 1/128 and 32');
        }
        else if(!right_ascension || !declination) {
            rsp.status(400).send('Error: right_ascension and declination not specified');
        }
        else if(!width || isNaN(width) || width>4096 || height < 1) {
            rsp.status(400).send('Error: width must be between 1-4096, got ' + width);
        }
        else if(!height || isNaN(height) || height>4096 || height < 1) {
            rsp.status(400).send('Error: height must be between 1-4096, got ' + width);
        } else {
            url = baseUrl+`/ImgCutout/getjpeg?ra=${right_ascension}&dec=${declination}&width=${width}&height=${height}&scale=${scale}&opt=${options}`;

            logger.info(`Getting image from URL ${url}`);

            // Check the cache
            cache.wrap(url, function(cacheCallback) {
                // Get the image -> not in cache!
                logger.trace('Requesting new image from SDSS!');
                var response = request.get(url);
                delete response.headers['cache-control'];

                // Gather the data...
                var result = new Buffer(0);
                response.on('data', function(data) {
                    result = Buffer.concat([result, data]);
                });
                response.on('end', function() {
                    return cacheCallback(null, result);
                });
            }, function(err, imageBuffer) {
                // Send the response to the user
                logger.info('Sending the response!');
                // Set the headers
                rsp.set('cache-control', 'private, no-store, max-age=0');
                rsp.set('content-type', 'image/jpeg');
                rsp.set('content-length', imageBuffer.length);
                rsp.set('connection', 'close');

                rsp.status(200).send(imageBuffer);
                logger.info('Sent the response!');
            });
        }

        // explicitly state that we're async
        return null;
    }
};
