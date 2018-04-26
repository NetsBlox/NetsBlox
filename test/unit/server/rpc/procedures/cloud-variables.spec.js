describe('cloud-variables', function() {
    const utils = require('../../../../assets/utils');
    const CloudVariables = utils.reqSrc('rpc/procedures/cloud-variables/cloud-variables');
    const RPCMock = require('../../../../assets/mock-rpc');
    const cloudvariables = new RPCMock(CloudVariables);

    utils.verifyRPCInterfaces(cloudvariables, [
        ['getVariable', ['name', 'password']],
        ['setVariable', ['name', 'value', 'password']],
        ['deleteVariable', ['name', 'password']],
        ['getUserVariable', ['name']],
        ['setUserVariable', ['name', 'value']],
        ['deleteUserVariable', ['name']],
    ]);

});
