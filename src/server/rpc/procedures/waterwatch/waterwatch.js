let WaterWatchRPC = {
    isStateless: true,
    getPath: () => '/waterwatch'
};

var debug = require('debug'),
    // request = require('request'),
    rp = require('request-promise'), //maybe use request-promise-native?
    error = debug('netsblox:rpc:trends:error'),
    CacheManager = require('cache-manager'),
    trace = debug('netsblox:rpc:trends:trace'),
    Q = require('q');

var baseUrl = 'https://waterservices.usgs.gov/nwis/iv/?',
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000}),
    geoNamesUsername = process.env.GOOGLE_TRENDS_USERNAME || 'hamidzr';


// turn an options object into query friendly string
function encodeQueryData(options) {
   let ret = [];
   for (let d in options)
     ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
   return ret.join('&');
}

// used to send feedback about errors to the caller.
function showError(err, response) {
    error(err);
    response.json(err);
}

let westernLong = -83;
let southernLat = 36;
let easternLong = -81;
let northernLat = 38;


// WaterWatchRPC.byCoordinates = function (northernLat, southernLat, westernLong, easternLong) {
    //init
    let options = {'format':'json', 'bBox':`${westernLong},${southernLat},${easternLong},${northernLat}`, 'siteType':'ST','siteStatus':'all'},
        url = baseUrl+encodeQueryData(options),
        socket = this.socket,
        response = this.response;

    trace('Requesting data from ', url);
    rp(url)
        .then(data => {
            // santize and send messages to user
            console.log(data);
        })
        .catch(err => {
            // show error
            showError(err,response);
        });

//     return null;  // explicitly return null since async
// };



// if(true) { // add check for the availability of api key
// module.exports = WaterWatchRPC;
// }
