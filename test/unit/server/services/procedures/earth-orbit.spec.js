describe('earth-orbit', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('EarthOrbit', [
        ['getLongitude', ['startyear', 'endyear']],
        ['getObliquity', ['startyear', 'endyear']],
        ['getEccentricity', ['startyear', 'endyear']],
        ['getInsolation', ['startyear', 'endyear']],
        ['getPrecession', ['startyear', 'endyear']]
    ]);
});