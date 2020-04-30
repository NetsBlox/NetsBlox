describe.only('geolocation', function() {
    const assert = require('assert').strict;
    const utils = require('../../../../assets/utils');
    var Geocoding = utils.reqSrc('services/procedures/geolocation/geolocation'),
        RPCMock = require('../../../../assets/mock-rpc'),
        geocoding = new RPCMock(Geocoding);

    utils.verifyRPCInterfaces('Geolocation', [
        ['city', ['latitude', 'longitude']],
        ['country', ['latitude', 'longitude']],
        ['countryCode', ['latitude', 'longitude']],
        ['state*', ['latitude', 'longitude']],
        ['stateCode*', ['latitude', 'longitude']],
        ['county*', ['latitude', 'longitude']],
        ['info', ['latitude', 'longitude']],
        ['geolocate', ['address']]
    ]);

    describe('geolocate', function() {
        it('should use proper key for caching', async () => {
            await geocoding.geolocate('Moscow, Russia');
            const response = await geocoding.geolocate('1025 16th Ave S, Nashville, TN 37212');
            const [[,lat], [,long]] = response;
            assert.equal(Math.floor(lat), 36);
            assert.equal(Math.floor(long), -87);
        });
    });

    describe('nearbySearch', function() {
        let defaultApiKey;
        before(() => defaultApiKey = geocoding.unwrap().apiKey);
        after(() => geocoding.unwrap().apiKey = defaultApiKey);

        it('should throw error if API key is invalid', async function() {
            geocoding.apiKey = geocoding.unwrap().apiKey.withValue('invalidKey');
            await assert.rejects(
                () => geocoding.nearbySearch(36, -87, 'pizza'),
                /The provided API key is invalid/
            );
        });
    });
});
