if(!process.env.GOOGLE_GEOCODING_API) {
    console.log('Warning: environment variable GOOGLE_GEOCODING_API not defined, Geolocation RPC will not work.');
} else {

    let GeoLocationRPC = {
        isStateless: true,
    };

    var debug = require('debug'),
        error = debug('netsblox:rpc:geolocation:error'),
        CacheManager = require('cache-manager'),
        NodeGeocoder = require('node-geocoder'),
        rp = require('request-promise'),
        trace = debug('netsblox:rpc:geolocation:trace');

    // init
    var cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000}),
        GEOCODER_API = process.env.GOOGLE_GEOCODING_API,
        geocoder = NodeGeocoder({
            provider: 'google',
            httpAdapter: 'https', // Default
            apiKey: GEOCODER_API, // for Mapquest, OpenCage, Google Premier
            formatter: null         // 'gpx', 'string', ...
        });

    // helper to filter json down
    function queryJson(json, query){
        // assuming that there is no digit in attribute names
        if (typeof(json) === 'string') {
            json = JSON.parse(json);
        }

        if (!query) return json;

        let queryComponents = [];
        let res = json;

        query.split('.').forEach(item => {
            let searchRes = /\d+/g.exec(item);
            if (searchRes) {
                queryComponents.push(item.substring(0,searchRes.index -1));
                queryComponents.push(searchRes[0]);
            }else {
                queryComponents.push(item);
            }
        });
        queryComponents.shift(); // remove the first item which is always empty
        queryComponents.forEach(q=>{
            if (res[q]){
                res = res[q];
            } else {
                res = null;
            }
        });
        if (typeof(res) === 'object') {
            res = JSON.stringify(res);
        }
        return res;
    }

    // reverse geocoding helper, doesn't return a promise. handles sending of response.
    let reverseGeocode = (lat, lon, response, query)=>{
        cache.wrap(lat + ', ' + lon + query, cacheCallback => {
            trace('Geocoding (not cached)', lat, lon);
            geocoder.reverse({lat, lon})
            .then(function(res) {
                // only intereseted in the first match
                res = queryJson(res[0], query);
                if (res === null) return cacheCallback('not found', null);
                // send the response to user
                return cacheCallback(null, res);
            })
            .catch((err) => {
                error(err);
                return cacheCallback('Error in reverse geocoding', null);
            });
        }, (err, results) => {
            if(results){
                trace('answering with',results);
                response.send(results);
            }else {
                showError(err, response);
            }
        });
    };


    // geocode an address and send back the details
    GeoLocationRPC.geolocate = function (address) {
        let response = this.response;

        trace('Geocoding', address);
        geocoder.geocode(address)
            .then(function(res) {
                trace(res);
                response.json([['latitude', res[0].latitude], ['longitude', res[0].longitude]]);
            })
            .catch(function(err) {
                error('Error in geocoding', err);
                showError('Failed to geocode',response);
            });

        return null;
    };

    // reverse geocode and send back a specific detail
    GeoLocationRPC.city = function (latitude, longitude) {
        reverseGeocode(latitude, longitude, this.response, '.city');
        return null;
    };


    // reverse geocode and send back a specific detail
    GeoLocationRPC.country = function (latitude, longitude) {
        reverseGeocode(latitude, longitude, this.response, '.country');
        return null;
    };

    // reverse geocode and send back a specific detail
    GeoLocationRPC.countryCode = function (latitude, longitude) {
        reverseGeocode(latitude, longitude, this.response, '.countryCode');
        return null;
    };

    // find places near a coordinate (20 reults max)
    GeoLocationRPC.nearbySearch = function (latitude, longitude, keyword, radius) {
        let response = this.response;
        radius = radius || 50000; // default to 50KM

        let requestOptions = {
            method: 'get',
            uri: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
            qs: {
                location: latitude + ',' + longitude,
                radius: radius,
                // rankby: 'distance',
                key: GEOCODER_API
            },
            json: true
        };

        if (keyword) {
            requestOptions.qs.keyword = keyword;
        }

        trace('Doing a nearby search', requestOptions);
        return rp(requestOptions).then(res=>{
            let places = res.results;
            places = places.map(place => {
                return [['latitude',place.geometry.location.lat],['longitude',place.geometry.location.lng],['name',place.name],['types',place.types]];
            });
            // keep the 10 best results
            places = places.slice(0,10);
            response.send(places);
        }).catch(err => {
            error('Error in searching for places',err);
            showError('Failed to find places',response);
        });

    };



    function showError(err, response) {
        // if we can't answer their question return snap null
        response.send('null');
    }

    module.exports = GeoLocationRPC;
}
