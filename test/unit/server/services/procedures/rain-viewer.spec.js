const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('RainViewer', [
        ['getTimeOffsets'],
        ['getColorSchemes'],
        ['getOverlay', ['latitude', 'longitude', 'width', 'height', 'zoom', 'timeOffset', 'options']],
    ]);
});
