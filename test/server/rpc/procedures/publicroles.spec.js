describe('publicroles', function() {
    var PublicRoles = require('../../../../src/server/rpc/procedures/public-roles/public-roles'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        publicroles = new RPCMock(PublicRoles);

    utils.verifyRPCInterfaces(publicroles, [
        ['requestPublicRoleId']
    ]);
});
