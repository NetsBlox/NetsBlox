// This is the SDSS RPC. It wraps the web API of the Sloan Digital Sky Survey.

'use strict';

var debug = require('debug'),
    request = require('request'),    
    CacheManager = require('cache-manager'),   
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    info = debug('netsblox:rpc:movie-db:info'),
    trace = debug('netsblox:rpc:movie-db:trace');


// Retrieving static images
var baseUrl = 'http://skyserver.sdss.org/dr13/SkyserverWS';

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    /**
     * Return the path to the given RPC
     *
     * @return {String}
     */
    getPath: function() {
        return '/SDSS';
    },

    arcHourMinSecToDeg: function(arcHour, arcMin, arcSec) {
        return 360.0 * (1.0/24.0) * ( (1.0/60.0) * ( ( (1.0/60.0) * parseFloat(arcSec)) + parseFloat(arcMin)) + parseFloat(arcHour));
    },

    getImage: function(ra, dec, scale, opt) {
        var width = 360;
        var height = 480;
        var rsp = this.response;
        var url;

        if(!ra || !dec) {
            rsp.status(400).send('Error: ra and dec not specified');        
        } else {
            url = baseUrl+`/ImgCutout/getjpeg?ra=${ra}&dec=${dec}&width=${width}&height=${height}&scale=${scale}&opt=${opt}`;

            info(`Getting image from URL ${url}`);

            // Check the cache
            cache.wrap(url, function(cacheCallback) {
                // Get the image -> not in cache!
                trace('Requesting new image from tmdb!');
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
                info('Sending the response!');
                // Set the headers
                rsp.set('cache-control', 'private, no-store, max-age=0');
                rsp.set('content-type', 'image/jpeg');
                rsp.set('content-length', imageBuffer.length);
                rsp.set('connection', 'close');

                rsp.status(200).send(imageBuffer);
                info('Sent the response!');
            });
        }

        // explicitly state that we're async
        return null;
    }
};
