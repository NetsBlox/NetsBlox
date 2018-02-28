describe('geolocation', function() {
    const utils = require('../../../../assets/utils');
    var Geocoding = utils.reqSrc('rpc/procedures/geolocation/geolocation'),
        RPCMock = require('../../../../assets/mock-rpc'),
        assert = require('assert'),
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

    describe('geolocate', function() {
        it('should use proper key for caching', done => {
            geocoding.geolocate('Moscow, Russia')
                .then(() => {
                    geocoding.geolocate('1025 16th Ave S, Nashville, TN 37212')
                        .then(response => {
                            let lat = response[0][1];
                            let long = response[1][1];
                            assert.equal(Math.floor(lat), 36);
                            assert.equal(Math.floor(long), -87);
                            done();
                        })
                        .catch(done);
                });
        });
    });
});
