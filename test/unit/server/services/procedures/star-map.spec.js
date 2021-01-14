const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('StarMap', [
        ['arcHourMinSecToDeg', ['arcHour', 'arcMin', 'arcSec']],
        ['findObject', ['name']],
        ['getImage', ['right_ascension', 'declination', 'arcseconds_per_pixel', 'options', 'width', 'height']]
    ]);
});
