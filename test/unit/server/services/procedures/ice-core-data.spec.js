const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('IceCoreData', [
        ['getIceCoreNames', []],
        ['getDataAvailability', []],
        ['getCarbonDioxideData', ['core', 'startyear', 'endyear']],
        ['getDelta18OData', ['core', 'startyear', 'endyear']],
        ['getDeuteriumData', ['core', 'startyear', 'endyear']],
        ['getTemperatureData', ['core', 'startyear', 'endyear']],
        ['getIceCoreMetadata', ['core']],
    ]);

    it('should be able to parse data w/o error', function() {
        utils.reqSrc('services/procedures/ice-core-data/data');
    });
});
