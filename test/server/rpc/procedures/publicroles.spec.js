describe('publicroles', function() {
    var PublicRoles = require('../../../../src/server/rpc/procedures/PublicRoles/PublicRoles'),
        RPCMock = require('../../../assets/MockRPC'),
        utils = require('../../../assets/utils'),
        publicroles = new RPCMock(PublicRoles);

    utils.verifyRPCInterfaces(publicroles, [
        ['requestPublicRoleId']
    ]);
});
