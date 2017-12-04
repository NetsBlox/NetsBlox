describe('geolocation', function() {
    const utils = require('../../../../assets/utils');
    var Geocoding = utils.reqSrc('rpc/procedures/geolocation/geolocation'),
        RPCMock = require('../../../../assets/mock-rpc'),
        geocoding = new RPCMock(Geocoding);

    utils.verifyRPCInterfaces(geocoding, [
        ['city', ['latitude', 'longitude']],
        ['country', ['latitude', 'longitude']],
        ['countryCode', ['latitude', 'longitude']],
        ['state*', ['latitude', 'longitude']],
        ['stateCode*', ['latitude', 'longitude']],
        ['county*', ['latitude', 'longitude']],
        ['info', ['latitude', 'longitude']],
        ['geolocate', ['address']]
    ]);
});
