describe('earth-orbit', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('EarthOrbit', [
        ['get2004Longitude', ['startyear', 'endyear']],
        ['get2004Obliquity', ['startyear', 'endyear']],
        ['get2004Eccentricity', ['startyear', 'endyear']],
        ['get2004Insolation', ['startyear', 'endyear']],
        ['get2004Precession', ['startyear', 'endyear']]
    ]);
});