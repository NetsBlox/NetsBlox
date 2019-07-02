describe('paleo-climate', function() {
    const utils = require('../../../../assets/utils');
    var PaleoService = utils.reqSrc('rpc/procedures/paleo-climate/paleo-climate'),
        RPCMock = require('../../../../assets/mock-rpc'),
        paleo = new RPCMock(PaleoService);

    utils.verifyRPCInterfaces(paleo, [
        ['getAllData', ['startyear', 'endyear', 'datatype', 'core']],
        ['getColumnData', ['startyear', 'endyear', 'datatype', 'core']],
        ['cores', []],
        ['dataTypes', []],
    ]);
});