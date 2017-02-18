if (false) {
    console.log('Warning: environment variable GEO_USERNAME not defined, GoogleTrends RPC will not work.');
} else {
    let TrendsRPC = {
        isStateless: true,
        getPath: () => '/GoogleTrends'
    };

    var debug = require('debug'),
        request = require('request'),
        googleTrends = require('google-trends-api'),
        translate = require('google-translate-api'),
        error = debug('netsblox:rpc:trends:error'),
        CacheManager = require('cache-manager'),
        trace = debug('netsblox:rpc:trends:trace'),
        Q = require('q');

    // TODO change cache ttl to 23 hours or until next day
    var countryInfoBaseUrl = 'http://ws.geonames.org/countryCodeJSON?',
        cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
        geoNamesUsername = 'demo';  // TODO: real username (probably from an env var) ( and hide the service and example if not set)

    TrendsRPC.byLocation = function (latitude, longitude) {

        // get location data eg: country, language
        // or we can use geocoder package
        let url = `${countryInfoBaseUrl}radius=${100}&lat=${latitude}&lng=${longitude}&username=${geoNamesUsername}`,
            response = this.response;
            // socket = this.socket;

        trace('Requesting country data from ', url);
        request(url, (err, res, body) => {
            if (err) {
                error('Could not request country data', err);
                return response.status(500).send('ERROR: ' + err);
            }
            // TODO check if body is expected - try catch
            let countryInfo = JSON.parse(body);
            trace('detected country: ', countryInfo.countryName, countryInfo, 'long', longitude, 'lat', latitude);
            if (typeof countryInfo.countryCode != 'undefined') {
                // QUESTION this.byCountryCode?
                // TODO caching,  lookupthe trends only if necessary
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
        cache.wrap(countryCode, cacheCallback => {
            // Get the trends -> not in cache!
            trace('this request is not cached, requesting googleTrends for : ', countryCode);
            googleTrends.hotTrends(countryCode)
                .then((trendsArr) => {
                    return trendsArr.slice(0, 10);
                })
                .then((trendsArr) => {
                    let translatePromisesArr = trendsArr.map((val) => {
                        return translate(val, {to: 'en'});
                    });
                    return Q.all(translatePromisesArr);
                })
                .then((translatedArr) => {
                    let trendsTexts = translatedArr.map(val => val.text);
                    // response.json(trendsTexts);
                    return cacheCallback(null, trendsTexts);
                })
                // doesn't catch some errors.. ?
                .catch((err) => {
                    error(err);
                    showError(`No trends available for ${countryCode}`, response);
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
}