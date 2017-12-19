describe('publicroles', function() {
    const utils = require('../../../../assets/utils');
    var PublicRoles = utils.reqSrc('rpc/procedures/public-roles/public-roles'),
        RPCMock = require('../../../../assets/mock-rpc'),
        publicroles = new RPCMock(PublicRoles);

    utils.verifyRPCInterfaces(publicroles, [
        ['requestPublicRoleId']
    ]);
});
