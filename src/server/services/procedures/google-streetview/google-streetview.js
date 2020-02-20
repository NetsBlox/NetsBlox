/**
 * The GoogleStreetView Service provides access to the Google Street View Image API
 * For more information, check out https://developers.google.com/maps/documentation/streetview/intro
 *
 * Terms of use: https://developers.google.com/maps/terms
 * @service
 */
'use strict';

const {GoogleMapsKey} = require('../utils/api-key');
const ApiConsumer = require('../utils/api-consumer');
const GoogleStreetView = new ApiConsumer('GoogleStreetView', 'https://maps.googleapis.com/maps/api/streetview',{cache: {ttl: 7*24*60*60}});
ApiConsumer.setRequiredApiKey(GoogleStreetView, GoogleMapsKey);

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
 * @deprecated
 */
GoogleStreetView.getViewFromLatLong = function(latitude, longitude, width, height, fieldofview, heading, pitch) {
    const key = this.apiKey.value;
    return this._sendImage({queryString: `?size=${width}x${height}&location=${latitude},${longitude}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`, method: 'GET'});
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
GoogleStreetView.getView = function(latitude, longitude, width, height, fieldofview, heading, pitch) {
    const key = this.apiKey.value;
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
    const key = this.apiKey.value;
    return this._sendImage({queryString: `?size=${width}x${height}&location=${location}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`, method: 'GET'});
};


/**
 * Get Street View metadata of a location using coordinates.
 * Status explanation: "OK": No errors occurred.
 * "ZERO_RESULTS": No image could be found near the provided location.
 * "NOT_FOUND": The location provided could not be found.
 * @param {Latitude} latitude Latitude coordinate of location
 * @param {Longitude} longitude Longitude coordinate of location
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Object} Metadata infromation about the requested Street View.
 */
GoogleStreetView.getInfo = function(latitude, longitude, width, height, fieldofview, heading, pitch) {
    const key = this.apiKey.value;
    const queryOpts = {
        path: '/metadata',
        queryString: `?location=${latitude},${longitude}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`
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
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Object} Metadata infromation about the requested Street View.
 */
GoogleStreetView.getInfoFromAddress = function(location, width, height, fieldofview, heading, pitch) {
    const key = this.apiKey.value;
    const queryOpts = {
        path: '/metadata',
        queryString: `?location=${location}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`
    };
    const parserFn = resp => resp; // explicitly do nothing
    return this._sendStruct(queryOpts, parserFn);
};

/**
 * Check for availability of imagery at a location using coordinates
 * @param {Latitude} latitude Latitude coordinate of location
 * @param {Longitude} longitude Longitude coordinate of location
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Boolean}
 */
GoogleStreetView.isAvailable = function(latitude, longitude, fieldofview, heading, pitch) {
    const key = this.apiKey.value;
    const queryOpts = {
        path: '/metadata',
        queryString: `?location=${latitude},${longitude}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`
    };
    const parserFn = resp => resp.status === 'OK';
    return this._sendStruct(queryOpts, parserFn);
};

/**
 * Check for availability of imagery at a location using an address
 * @param {String} location Address or Name of location
 * @param {BoundedNumber<1,120>} fieldofview Field of View of image, maximum of 120
 * @param {BoundedNumber<0,360>} heading Heading of view
 * @param {BoundedNumber<-90,90>} pitch Pitch of view, 90 to point up, -90 to point down
 * @returns {Boolean}
 */
GoogleStreetView.isAvailableFromAddress = function(location, fieldofview, heading, pitch) {
    const key = this.apiKey.value;
    const queryOpts = {
        path: '/metadata',
        queryString: `?location=${location}&fov=${fieldofview}&heading=${heading}&pitch=${pitch}&key=${key}`
    };
    const parserFn = resp => resp.status === 'OK';
    return this._sendStruct(queryOpts, parserFn);
};


module.exports = GoogleStreetView;
