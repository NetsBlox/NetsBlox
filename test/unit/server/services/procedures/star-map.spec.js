describe('star-map', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('StarMap', [
        ['arcHourMinSecToDeg', ['arcHour', 'arcMin', 'arcSec']],
        ['findObject', ['name']],
        ['getImage', ['right_ascension', 'declination', 'arcseconds_per_pixel', 'options', 'width', 'height']]
    ]);
});
