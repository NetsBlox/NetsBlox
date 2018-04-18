/**
 * The GoogleStreetView Service provides access to the Google Street View Image API
 * For more information, check out https://developers.google.com/maps/documentation/streetview/intro
 *
 * Terms of use: https://developers.google.com/maps/terms
 * @service
 */
'use strict';

var debug = require('debug'),
    trace = debug('netsblox:rpc:static-map:trace'),
    request = require('request'),
    geolib = require('geolib'),
    CacheManager = require('cache-manager'),
    Storage = require('../../storage'),
    // TODO: Change this cache to mongo or something (file?)
    // This cache is shared among all GoogleMaps instances
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    key = process.env.GOOGLE_MAPS_KEY;

var storage;


const ApiConsumer = require('../utils/api-consumer');
const GoogleStreetView = new ApiConsumer('google-streetview', 'https://maps.googleapis.com/maps/api/streetview?',{cache: {ttl: 5*60}});

GoogleStreetView.isSupported = () => {
    if(!key){
        /* eslint-disable no-console*/
        console.error('GOOGLE_MAPS_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!key;
};

/**
 * Get the current price of the given stock, with a 15 min delay
 * @param {Number} width Company stock ticker symbol
 * @param {Number} height Company stock ticker symbol
 * @param {Number} latitude Company stock ticker symbol
 * @param {Number} longitude Company stock ticker symbol
 * @param {Number} fieldofview Company stock ticker symbol
 * @param {Number} heading Company stock ticker symbol
 * @param {Number} pitch Company stock ticker symbol
 * @returns {Image} Current price for the specified stock
 */
GoogleStreetView.getView = function(width, height, latitude, longitude, fieldofview, heading, pitch) {
    return this._sendImage({queryString: `size=${width}x${height}&location=${latitude},${longitude}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`, method: 'GET'});
};

GoogleStreetView.serviceName = 'GoogleStreetView';

module.exports = GoogleStreetView;
