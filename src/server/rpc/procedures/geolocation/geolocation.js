let GeoLocationRPC = {
    isStateless: true,
    getPath: () => '/geolocation'
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

// helper to filter json down
function queryJson(json, query){
  // assuming that there is no digit in attribute names
  if (typeof(json) === 'string') {
    json = JSON.parse(json);
  }
  let arr2 = [];
  let res = json

  query.split(".").forEach(item => {
    let searchRes = /\d+/g.exec(item);
    if (searchRes) {
      arr2.push(item.substring(0,searchRes.index -1))
      arr2.push(searchRes[0])
    }else {
      arr2.push(item)
    }
  })
  arr2.shift() // remove the first item which is always empty

  arr2.forEach(q=>{
    res = res[q]
  })
  if (typeof(res) === 'object') {
    res = JSON.stringify(res);
  }
  return res;
}

// reverse geocoding helper, doesn't return a promise. Hanldes sending of response.
let reverseGeocode = (lat, lon, response, query)=>{
  cache.wrap(lat + ', ' + lon, cacheCallback => {
    trace('Geocoding (not cached)', lat, lon);
    geocoder.reverse({lat, lon})
      .then(function(res) {
        // only intereseted in the first match
        res = queryJson(res[0], query);
        // send the response to user
        return cacheCallback(null, res);
      })
      .catch(err => {
        error('Error in reverse geocoding', err);
        // showError('Failed to reverse geocode',response);
        return cacheCallback('Error in reverse geocoding', null);
      });
  }, (err, results) => {
    if(results){
      response.json(results);
    }else {
      showError(err)
    }
  });
}


// geocode an address and send back the details
GeoLocationRPC.geolocate = function (address) {
    let response = this.response;

    trace('Geocoding', address);
    geocoder.geocode(address)
      .then(function(res) {
        trace(res);
        response.json([res[0].latitude, res[0].longitude]);
      })
      .catch(function(err) {
        error('Error in geocoding', err);
        showError('Failed to geocode',response);
      });

    return null;
};

// reverse geocode and send back a specific detail
GeoLocationRPC.city = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.city')
    return null;
};


// reverse geocode and send back a specific detail
GeoLocationRPC.country = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.country')
    return null;
};

// reverse geocode and send back a specific detail
GeoLocationRPC.countryCode = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.countryCode')
    return null;
};

// find places near a coordinate (20 reults max)
GeoLocationRPC.nearbySearch = function (latitude, longitude, keyword, radius) {
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



function showError(err, response) {
    response.json(err);
}

module.exports = GeoLocationRPC;
