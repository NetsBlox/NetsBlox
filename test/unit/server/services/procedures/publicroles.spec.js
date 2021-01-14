const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const Projects = utils.reqSrc('storage/projects');
    const assert = require('assert');
    const PublicRoles = utils.reqSrc('services/procedures/public-roles/public-roles');
    const RPCMock = require('../../../../assets/mock-service');
    const publicroles = new RPCMock(PublicRoles);

    utils.verifyRPCInterfaces('PublicRoles', [
        ['getPublicRoleId'],
        ['requestPublicRoleId'],
    ]);

    describe('getPublicRoleId', function() {
        before(() => utils.reset());

        it('should return the public role ID of the socket', async function() {
            const project = await Projects.get('brian', 'MultiRoles');
            publicroles.socket.projectId = project.getId();
            publicroles.socket.roleId = await project.getRoleId('r1');
            const id = await publicroles.getPublicRoleId();
            assert.equal(id, 'r1@MultiRoles@brian');
        });
    });
});
