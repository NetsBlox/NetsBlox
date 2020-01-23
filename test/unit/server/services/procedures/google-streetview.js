describe('google-streetview', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('GoogleStreetView', [
        ['getViewFromLatLong', ['latitude', 'longitude', 'width', 'height', 'fieldofview', 'heading', 'pitch']],
        ['getViewFromAddress', ['location', 'width', 'height', 'fieldofview', 'heading', 'pitch']],
    ]);
});
