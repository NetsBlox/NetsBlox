describe('google-streetview', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('GoogleStreetView', [
        ['getView', ['latitude', 'longitude', 'width', 'height', 'fieldofview', 'heading', 'pitch']],
        ['getInfo', ['latitude', 'longitude', 'fieldofview', 'heading', 'pitch']],
        ['getInfoFromAddress', ['location', 'fieldofview', 'heading', 'pitch']],
        ['getViewFromLatLong', ['latitude', 'longitude', 'width', 'height', 'fieldofview', 'heading', 'pitch']],
        ['getViewFromAddress', ['location', 'width', 'height', 'fieldofview', 'heading', 'pitch']],
        ['isAvailable', ['latitude', 'longitude', 'fieldofview', 'heading', 'pitch']],
        ['isAvailableFromAddress', ['location', 'fieldofview', 'heading', 'pitch']],
    ]);
});
