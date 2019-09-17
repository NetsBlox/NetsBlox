describe('waterwatch', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('WaterWatch', [
        ['gageHeight', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['streamFlow', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['waterTemp', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']]
    ]);
});
