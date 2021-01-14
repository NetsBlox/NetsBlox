const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('EarthOrbit', [
        ['getLongitude', ['startyear', 'endyear']],
        ['getObliquity', ['startyear', 'endyear']],
        ['getEccentricity', ['startyear', 'endyear']],
        ['getInsolation', ['startyear', 'endyear']],
        ['getPrecession', ['startyear', 'endyear']]
    ]);
});
