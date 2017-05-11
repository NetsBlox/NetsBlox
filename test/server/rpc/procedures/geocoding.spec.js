describe('geocoding', function() {
    var Geocoding = require('../../../../src/server/rpc/procedures/geocoding/geocoding'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        geocoding = new RPCMock(Geocoding);

    utils.verifyRPCInterfaces(geocoding, [
      ['getCity', ['latitude', 'longitude']],
      ['getCountry', ['latitude', 'longitude']],
      ['getCountryCode', ['latitude', 'longitude']],
      ['reverseGeocode', ['latitude', 'longitude']],
      ['geocode', ['address']]
    ]);
    
});
