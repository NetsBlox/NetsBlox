describe('star-map', function() {
    const utils = require('../../../../assets/utils');
    var StarMap = utils.reqSrc('rpc/procedures/star-map/star-map'),
        RPCMock = require('../../../../assets/mock-rpc'),
        starmap = new RPCMock(StarMap);

    utils.verifyRPCInterfaces(starmap, [
        ['arcHourMinSecToDeg', ['arcHour', 'arcMin', 'arcSec']],
        ['findObject', ['name']],
        ['getImage', ['right_ascension', 'declination', 'arcseconds_per_pixel', 'options', 'width', 'height']]
    ]);
});
