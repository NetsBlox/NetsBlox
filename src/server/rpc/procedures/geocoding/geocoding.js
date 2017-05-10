let GeocodingRPC = {
    isStateless: true,
    getPath: () => '/geocoding'
};

var debug = require('debug'),
    error = debug('netsblox:rpc:trends:error'),
    CacheManager = require('cache-manager'),
    NodeGeocoder = require('node-geocoder'),
    axios = require('axios'),
    trace = debug('netsblox:rpc:trends:trace');

// init
var cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000}),
    GEOCODER_API = process.env.GOOGLE_GEOCODING_API,
    geocoder = NodeGeocoder({
      provider: 'google',
      httpAdapter: 'https', // Default
      apiKey: GEOCODER_API, // for Mapquest, OpenCage, Google Premier
      formatter: null         // 'gpx', 'string', ...
    });



// reverse geocoding helper, doesn't return a promise. Hanldes sending of response.
// TODO  can be generalized to be used as a consumer of APIs with json responses
let reverseGeocode = (lat, lon, response, filtersArr)=>{
  // TODO add caching with memoizer
  trace('Geocoding', lat, lon);
  geocoder.reverse({lat, lon})
    .then(function(res) {
      // only intereseted in the first match
      res = res[0];
      if (filtersArr) {
        filtersArr.forEach(filter => {
          res = res[filter];
        });
      }else {
        res = JSON.stringify(res);
      }
      // send the response to user
      response.json(res);
    })
    .catch(err => {
      error('Error in reverse geocoding', err);
      showError('Failed to reverse geocode',response);
    });
}


// reverse geocode and send back the details
GeocodingRPC.reverseGeocode = function (latitude, longitude) {
  reverseGeocode(latitude, longitude, this.response)
    return null;  // explicitly return null to indicate an async action
}; // end of request

// geocode an address and send back the details
GeocodingRPC.geocode = function (address) {
    let response = this.response;

    trace('Geocoding', address);
    geocoder.geocode(address)
      .then(function(res) {
        trace(res);
        response.json(JSON.stringify(res));
      })
      .catch(function(err) {
        error('Error in geocoding', err);
        showError('Failed to geocode',response);
      });

    return null;
};

// reverse geocode and send back an specific detail
GeocodingRPC.getCity = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, ['city'])
    return null;
};


// reverse geocode and send back an specific detail
GeocodingRPC.getCountry = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, ['country'])
    return null;
};

// reverse geocode and send back an specific detail
GeocodingRPC.getCountryCode = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, ['countryCode'])
    return null;
};

// find places near a coordinate (20 reults max)
GeocodingRPC.nearbySearch = function (latitude, longitude, keyword, radius) {
    let response = this.response;
    radius = radius || 100; // default to 100
    trace('Doing a nearby search', latitude, longitude);

    let requestOptions = {
      method: 'get',
      url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      params: {
        location: latitude + ',' + longitude,
        radius: radius,
        // rankby: 'distance',
        key: GEOCODER_API
      }
    };

    if (keyword) {
      requestOptions.params.keyword = keyword;
    }

    axios(requestOptions).then(res=>{
      let places = res.data.results;
      places = places.map(place => {
        return place.name + ' (' + place.types[0] + ')'
      })
      response.json(places);
    }).catch(err => {
      error("Error in searching for places",err);
      showError('Failed to find places',response);
    })

    return null;
};



    // cache.wrap(countryCode, cacheCallback => {
    //     // Get the trends -> not in cache!
    //     trace('this request is not cached, requesting googleTrends for : ', countryCode);
    //     googleTrends.hotTrends(countryCode)
    //
    //         .then((translatedArr) => {
    //             let trendsTexts = translatedArr.map(val => val.text);
    //             return cacheCallback(null, trendsTexts);
    //         })
    //         .catch((err) => {
    //             error(err);
    //             return cacheCallback(null, `No trends available for ${countryCode}`);
    //         });
    // }, (err, results) => {
    //     // Send the response to the user
    //     trace('sending the response');
    //     response.json(results);
    //     trace('Sent the response!');
    // });


function showError(err, response) {
    response.json(err);
}

module.exports = GeocodingRPC;
