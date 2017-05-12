describe('star-map', function() {
    var StarMap = require('../../../../src/server/rpc/procedures/star-map/star-map'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        starmap = new RPCMock(StarMap);

    utils.verifyRPCInterfaces(starmap, [
        ['arcHourMinSecToDeg', ['arcHour', 'arcMin', 'arcSec']],
        ['findObject', ['name']],
        ['getImage', ['right_ascension', 'declination', 'arcseconds_per_pixel', 'options', 'width', 'height']]
    ]);
});
