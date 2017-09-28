describe('geolocation', function() {
    var Geocoding = require('../../../../src/server/rpc/procedures/geolocation/geolocation'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        geocoding = new RPCMock(Geocoding);

    utils.verifyRPCInterfaces(geocoding, [
        ['city', ['latitude', 'longitude']],
        ['country', ['latitude', 'longitude']],
        ['countryCode', ['latitude', 'longitude']],
        ['state', ['latitude', 'longitude']],
        ['stateCode', ['latitude', 'longitude']],
        ['county', ['latitude', 'longitude']],
        ['geolocate', ['address']]
    ]);
});
