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
const GoogleStreetView = new ApiConsumer('google-streetview', 'https://maps.googleapis.com/maps/api/streetview',{cache: {ttl: 7*24*60*60}});

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
 * @param {BoundedNumber<1,2000>} width Width of image
 * @param {BoundedNumber<1,2000>} height Height of image
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Image} Image of requested location with specified size and orientation
 */
GoogleStreetView.getViewFromLatLong = function(latitude, longitude, width, height, fieldofview, heading, pitch) {
    return this._sendImage({queryString: `?size=${width}x${height}&location=${latitude},${longitude}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`, method: 'GET'});
};

/**
 * Get Street View image of a location from a location string
 * @param {String} location Address or Name of location
 * @param {BoundedNumber<1,2000>} width Width of image
 * @param {BoundedNumber<1,2000>} height Height of image
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Image} Image of requested location with specified size and orientation
 */
GoogleStreetView.getViewFromAddress = function(location, width, height, fieldofview, heading, pitch) {
    return this._sendImage({queryString: `?size=${width}x${height}&location=${location}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`, method: 'GET'});
};


/**
 * Get Street View metadata of a location using coordinates.
 * Status explanation: "OK" Indicates that no errors occurred.
 * "ZERO_RESULTS" Indicates that no panorama could be found near the provided location.
 * "NOT_FOUND" Indicates that the address string provided in the location parameter could not be found.
 * @param {Latitude} latitude Latitude coordinate of location
 * @param {Longitude} longitude Longitude coordinate of location
 * @param {BoundedNumber<1,2000>} width Width of image
 * @param {BoundedNumber<1,2000>} height Height of image
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Object} Metadata infromation about the requested Street View.
 */
GoogleStreetView.getMetadataFromLatLong = function(latitude, longitude, width, height, fieldofview, heading, pitch) {
    const queryOpts = {
        queryString: `/metadata?size=${width}x${height}&location=${latitude},${longitude}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`
    };
    const parserFn = resp => resp; // explicitly do nothing
    return this._sendStruct(queryOpts, parserFn);
};

/**
 * Get Street View metadata of a location using a location query.
 * Status explanation: "OK": No errors occurred.
 * "ZERO_RESULTS": No image could be found near the provided location.
 * "NOT_FOUND": The location provided could not be found.
 * @param {String} location Address or Name of location
 * @param {BoundedNumber<1,2000>} width Width of image
 * @param {BoundedNumber<1,2000>} height Height of image
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Object} Metadata infromation about the requested Street View.
 */
GoogleStreetView.getMetadataFromAddress = function(location, width, height, fieldofview, heading, pitch) {
    const queryOpts = {
        queryString: `/metadata?size=${width}x${height}&location=${location}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`
    };
    const parserFn = resp => resp; // explicitly do nothing
    return this._sendStruct(queryOpts, parserFn);
};

GoogleStreetView.serviceName = 'GoogleStreetView';

module.exports = GoogleStreetView;
