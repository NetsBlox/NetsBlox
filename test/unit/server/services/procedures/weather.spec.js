const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Weather', [
        ['temperature', ['latitude', 'longitude']],
        ['temp', ['latitude', 'longitude']],
        ['humidity', ['latitude', 'longitude']],
        ['description', ['latitude', 'longitude']],
        ['windSpeed', ['latitude', 'longitude']],
        ['windAngle', ['latitude', 'longitude']],
        ['icon', ['latitude', 'longitude']],
        ['listRadars', ['latitude', 'longitude', 'width', 'height', 'zoom']],
        ['plotAllRadarImages', ['latitude', 'longitude', 'width', 'height', 'zoom', 'type']],
        ['plotRadarImages', ['latitude', 'longitude', 'width', 'height', 'zoom', 'radars', 'type']],
    ]);
});
