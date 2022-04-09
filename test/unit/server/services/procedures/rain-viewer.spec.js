const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Hangman', [
        ['getRadarTimeOffsets'],
        ['getRadarMap', ['latitude', 'longitude', 'width', 'height', 'zoom', 'timeOffset', 'options']],
    ]);
});
