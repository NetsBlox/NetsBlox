describe('paleo-climate', function() {
    const utils = require('../../../../assets/utils');
    var PaleoService = utils.reqSrc('rpc/procedures/paleo-climate/paleo-climate'),
        RPCMock = require('../../../../assets/mock-rpc'),
        PaleoClimate = new RPCMock(PaleoService);

    utils.verifyRPCInterfaces(PaleoClimate, [
        ['getIceCoreNames', []],
        ['getDataAvailability', []],
        ['getCarbonDioxideData', ['core', 'startyear', 'endyear']],
        ['getDelta18OData', ['core', 'startyear', 'endyear']],
        ['getDeuteriumData', ['core', 'startyear', 'endyear']],
        ['getTemperatureData', ['core', 'startyear', 'endyear']],
        ['getIceCoreMetadata', ['core']],
    ]);
});
