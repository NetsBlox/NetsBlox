const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const assert = require('assert').strict;
    var Geocoding = utils.reqSrc('services/procedures/geolocation/geolocation'),
        RPCMock = require('../../../../assets/mock-service'),
        geocoding;

    before(() => geocoding = new RPCMock(Geocoding));
    after(() => geocoding.destroy());
    utils.verifyRPCInterfaces('Geolocation', [
        ['nearbySearch', ['latitude', 'longitude', 'keyword', 'radius']],
        ['city', ['latitude', 'longitude']],
        ['country', ['latitude', 'longitude']],
        ['countryCode', ['latitude', 'longitude']],
        ['state*', ['latitude', 'longitude']],
        ['stateCode*', ['latitude', 'longitude']],
        ['county*', ['latitude', 'longitude']],
        ['info', ['latitude', 'longitude']],
        ['geolocate', ['address']],
        ['timezone', ['address']],
        ['streetAddress', ['address']],
    ]);

    describe('geolocate', function() {
        it('should use proper key for caching', async () => {
            await geocoding.geolocate('Moscow, Russia');
            const { latitude, longitude } = await geocoding.geolocate('1025 16th Ave S, Nashville, TN 37212');
            assert.equal(Math.floor(latitude), 36);
            assert.equal(Math.floor(longitude), -87);
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
