const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('WaterWatch', [
        ['stop'],
        ['gageHeight', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['streamFlow', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['waterTemp', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']]
    ]);
});
