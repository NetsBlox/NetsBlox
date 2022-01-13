const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('NexradRadar', [
        ['listRadars', ['latitude', 'longitude', 'width', 'height', 'zoom']],
        ['plotRadarImages', ['latitude', 'longitude', 'width', 'height', 'zoom', 'type', 'radars']],
    ]);
});
