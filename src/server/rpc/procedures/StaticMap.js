// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:StaticMap:log'),
    trace = debug('NetsBlox:RPCManager:StaticMap:trace'),
    info = debug('NetsBlox:RPCManager:StaticMap:info'),
    request = require('request'),
    key = process.env.GOOGLE_MAPS_KEY;

var baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';

var getGoogleParams = function(options) {
    var params = [];
    params.push('center=' + options.lat + ',' + options.lon);
    params.push('size=' + options.width + 'x' + options.height);
    params.push('key=' + key);
    params.push('zoom=12');
    return params.join('&');
};

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/staticmap';
    },

    getActions: function() {
        return ['getMap'];
    },

    getMap: function(req, res) {
        var params = getGoogleParams(req.query),
            url = baseUrl+'?'+params;

        trace('request params:', req.query);
        trace('url is '+url);
        request.get(url).pipe(res);
    }
};
