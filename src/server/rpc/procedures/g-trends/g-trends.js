let TrendsRPC = {
    isStateless: true,
    getPath: () => '/g-trends'
};

var debug = require('debug'),
    request = require('request'),
    googleTrends = require('google-trends-api'),
    translate = require('google-translate-api'),
    error = debug('netsblox:rpc:trends:error'),
    trace = debug('netsblox:rpc:trends:trace');

TrendsRPC.byLocation = function(latitude, longitude) {

    // get location data eg: country, language
    // or can use geocoder package
    let countryInfoBaseUrl = 'http://ws.geonames.org/countryCodeJSON?';
    let username = 'demo';
    let url = `${countryInfoBaseUrl}radius=${100}&lat=${latitude}&lng=${longitude}&username=${username}`,
        response = this.response,
        socket = this.socket;
    trace('Requesting country data from ', url);
    let countryInfo = 'this is stupid';
    request(url, (err, res, body) => {
        if (err) {
            return response.status(500).send('ERROR: ' + err);
        }
        // TODO check if body is expected - try catch
        countryInfo = JSON.parse(body);
        trace('detected country: ', countryInfo.countryName, countryInfo, 'long', longitude, 'lat', latitude);
        // TODO synchronized sth? promise? gonna do it this way for now
        if (typeof countryInfo.countryCode != 'undefined') {
            getTrendsByCountry(countryInfo.countryCode);
        }else{
            let msg = {
                type: 'message',
                dstId: socket.roleId,
                msgType: 'trend',
                content: {
                    q: 'country not found'
                }
              };
            socket.send(msg);
        }
    }); //end of request

    // get trends
    function getTrendsByCountry (countryCode) {
        googleTrends.hotTrends(countryCode)
            .then(function (results) {
                // trace(results);
                // just the top5 please
                results = results.slice(0,5);
                // TODO check if it needs translation
                translateToEn(results);

            })
            .catch(function (err) {
                error(err);
            });
    }

    // translate to eng
    // TODO handle arrays as input ( one call ) (no overloading? )
    function translateToEn (param){
        if (Array.isArray(param)){
            // TODO how to manipulate the current array (inplace) foreach & return?
            // let translations = [];
            for (let item of param){
                translateToEn(item);
            }
            // return translations;
        }else {
            translate(param, {to: 'en'}).then(res => {
                // QUESTION what does this do?
                // response.send(string);
                let msg = {
                    type: 'message',
                    dstId: socket.roleId,
                    msgType: 'trend',
                    content: {
                        q: res.text
                    }
                };
                socket.send(msg);
                // return res.text;
            }).catch(err => {
                error(err);
            });
        }
    }

    // or null?
    return 0;
};


module.exports = TrendsRPC;