const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
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
