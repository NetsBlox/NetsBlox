// This is the Sky Map RPC. It wraps the web API of the Sloan Digital Sky Survey.

'use strict';

var debug = require('debug'),
    request = require('request'),    
    CacheManager = require('cache-manager'),   
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    info = debug('netsblox:rpc:star-map:info'),
    trace = debug('netsblox:rpc:star-map:trace');


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
        return '/sky-map';
    },

    arcHourMinSecToDeg: function(arcHour, arcMin, arcSec) {
        return 360.0 * (1.0/24.0) * ( (1.0/60.0) * ( ( (1.0/60.0) * parseFloat(arcSec)) + parseFloat(arcMin)) + parseFloat(arcHour));
    },

    getImage: function(right_ascension, declination, arcseconds_per_pixel, options) {
        var width = 360;
        var height = 480;
        var rsp = this.response;
        var url;
        var scale = parseFloat(arcseconds_per_pixel);

        if(isNaN(scale) || scale>32.0 || scale < 1.0/128.0) {
            rsp.status(400).send('Error: arcseconds_per_pixel is out of range. Valid values are between 1/128 and 32');        
        }
        else if(!right_ascension || !declination) {
            rsp.status(400).send('Error: right_ascension and declination not specified');        
        } else {
            url = baseUrl+`/ImgCutout/getjpeg?ra=${right_ascension}&dec=${declination}&width=${width}&height=${height}&scale=${scale}&opt=${options}`;

            info(`Getting image from URL ${url}`);

            // Check the cache
            cache.wrap(url, function(cacheCallback) {
                // Get the image -> not in cache!
                trace('Requesting new image from SDSS!');
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
