/**
 * The GoogleStreetView Service provides access to the Google Street View Image API
 * For more information, check out https://developers.google.com/maps/documentation/streetview/intro
 *
 * Terms of use: https://developers.google.com/maps/terms
 * @service
 */
'use strict';

var key = process.env.GOOGLE_MAPS_KEY;

const ApiConsumer = require('../utils/api-consumer');
const GoogleStreetView = new ApiConsumer('google-streetview', 'https://maps.googleapis.com/maps/api/streetview?',{cache: {ttl: 7*24*60*60}});

GoogleStreetView.isSupported = () => {
    if(!key){
        /* eslint-disable no-console*/
        console.error('GOOGLE_MAPS_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!key;
};

/**
 * Get Street View image of a location using coordinates
 * @param {Latitude} latitude Latitude coordinate of location
 * @param {Longitude} longitude Longitude coordinate of location
 * @param {Number} width Width of image
 * @param {Number} height Height of image
 * @param {Number} fieldofview Field of View of image
 * @param {Number} heading Heading of view
 * @param {Number} pitch Pitch of view
 * @returns {Image} Image of requested location with specified size and orientation
 */
GoogleStreetView.getViewFromLatLong = function(latitude, longitude, width, height, fieldofview, heading, pitch) {
    return this._sendImage({queryString: `size=${width}x${height}&location=${latitude},${longitude}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`, method: 'GET'});
};

/**
 * Get Street View image of a location from a location string
 * @param {String} address Address or Name of location
 * @param {Number} width Width of image
 * @param {Number} height Height of image
 * @param {Number} fieldofview Field of View of image
 * @param {Number} heading Heading of view
 * @param {Number} pitch Pitch of view
 * @returns {Image} Image of requested location with specified size and orientation
 */
GoogleStreetView.getViewFromAddress = function(location, width, height, fieldofview, heading, pitch) {
    return this._sendImage({queryString: `size=${width}x${height}&location=${location}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`, method: 'GET'});
};

GoogleStreetView.serviceName = 'GoogleStreetView';

module.exports = GoogleStreetView;
