let TrendsRPC = {
    isStateless: true,
    getPath: () => '/GoogleTrends'
};

var debug = require('debug'),
    request = require('request'),
    googleTrends = require('google-trends-api'),
    error = debug('netsblox:rpc:trends:error'),
    CacheManager = require('cache-manager'),
    trace = debug('netsblox:rpc:trends:trace');

var countryInfoBaseUrl = 'http://ws.geonames.org/countryCodeJSON?',
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000}),
    geoNamesUsername = process.env.GOOGLE_TRENDS_USERNAME || 'hamidzr';

TrendsRPC.byLocation = function (latitude, longitude) {
    // get location data eg: country, language
    // or we can use geocoder package
    let url = `${countryInfoBaseUrl}radius=${50}&lat=${latitude}&lng=${longitude}&username=${geoNamesUsername}`,
        response = this.response;

    trace('Requesting country data from ', url);
    request(url, (err, res, body) => {
        if (err) {
            error('Could not request country data', err);
            return response.status(500).send('ERROR: ' + err);
        }
        let countryInfo = JSON.parse(body);
        trace('detected country: ', countryInfo.countryName, countryInfo, 'long', longitude, 'lat', latitude);
        if (typeof countryInfo.countryCode != 'undefined') {
            // Improve: google does not use official country codes for trends see VN vs VE
            TrendsRPC.byCountryCode(countryInfo.countryCode);
        } else {
            showError('Failed to detect the country.', response);
        }
    }); // end of request

    return null;  // explicitly return null since async
};


TrendsRPC.byCountryCode = function (countryCode) {
    let response = this.response;

    // assumption: first callback is called when there is nochaed value for the id
    countryCode = countryCode.toUpperCase();
    cache.wrap(countryCode, cacheCallback => {
        // Get the trends -> not in cache!
        trace('this request is not cached, requesting googleTrends for : ', countryCode);
        googleTrends.hotTrends(countryCode)
            .then((trendsArr) => {
                return trendsArr.slice(0, 10);
            })
            .then((results) => {
                trace(results);
                return cacheCallback(null, results);
            })
            .catch((err) => {
                error(err);
                return cacheCallback(null, `No trends available for ${countryCode}`);
            });
    }, (err, results) => {
        // Send the response to the user
        trace('sending the response');
        response.json(results);
        trace('Sent the response!');
    });

    return null;  // explicitly return null since async
};

function showError(err, response) {
    response.json(err);
}

module.exports = TrendsRPC;
