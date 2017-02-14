let TrendsRPC = {
    isStateless: true,
    getPath: () => '/GoogleTrends'
};

var debug = require('debug'),
    request = require('request'),
    googleTrends = require('google-trends-api'),
    translate = require('google-translate-api'),
    error = debug('netsblox:rpc:trends:error'),
    trace = debug('netsblox:rpc:trends:trace');
let q = require('q');

TrendsRPC.byLocation = function(latitude, longitude) {

    // get location data eg: country, language
    // or can use geocoder package
    let countryInfoBaseUrl = 'http://ws.geonames.org/countryCodeJSON?';

    let username = 'demo';
    let url = `${countryInfoBaseUrl}radius=${100}&lat=${latitude}&lng=${longitude}&username=${username}`,
        response = this.response,
        socket = this.socket;
    trace('Requesting country data from ', url);
    request(url, (err, res, body) => {
        if (err) {
            return response.status(500).send('ERROR: ' + err);
        }
        // TODO check if body is expected - try catch
        let countryInfo = JSON.parse(body);
        trace('detected country: ', countryInfo.countryName, countryInfo, 'long', longitude, 'lat', latitude);
        // TODO synchronized sth? promise? gonna do it this way for now
        if (typeof countryInfo.countryCode != 'undefined') {
            // TODO google does not use official country codes for trends see VN vs VE
            googleTrends.hotTrends(countryInfo.countryCode)
                .then((trendsArr)=>{
                    return trendsArr.slice(0,5);
                })
                .then((trendsArr)=>{
                    let translatePromisesArr = trendsArr.map((val) => {
                        return translate(val,{to:'en'});
                    });
                    return q.all(translatePromisesArr);
                })
                .then((translatedArr) => {
                    let trendsTexts = translatedArr.map(val => val.text);
                    response.json(trendsTexts);
                })
                // doesn't catch some errors..
                .catch((err) => {
                    error(err);
                    showError(`no trends available for ${countryInfo.countryCode}`);
                });

        }else{
            showError('failed to detect the country.');
        }
    }); //end of request

    function showError(err){
        let msg = {
            type: 'message',
            dstId: socket.roleId,
            msgType: 'trends',
            content: {
                array: err
            }
        };
        socket.send(msg);
    }

    // or null?
    return null;
};


module.exports = TrendsRPC;
