describe('ice-core-data', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('IceCoreData', [
        ['getIceCoreNames', []],
        ['getDataAvailability', []],
        ['getCarbonDioxideData', ['core', 'startyear', 'endyear']],
        ['getDelta18OData', ['core', 'startyear', 'endyear']],
        ['getDeuteriumData', ['core', 'startyear', 'endyear']],
        ['getTemperatureData', ['core', 'startyear', 'endyear']],
        ['getIceCoreMetadata', ['core']],
    ]);
});
