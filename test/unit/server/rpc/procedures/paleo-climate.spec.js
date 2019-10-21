describe('paleo-climate', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('PaleoClimate', [
        ['getIceCoreNames', []],
        ['getDataAvailability', []],
        ['getCarbonDioxideData', ['core', 'startyear', 'endyear']],
        ['getDelta18OData', ['core', 'startyear', 'endyear']],
        ['getDeuteriumData', ['core', 'startyear', 'endyear']],
        ['getTemperatureData', ['core', 'startyear', 'endyear']],
        ['getIceCoreMetadata', ['core']],
    ]);
});
