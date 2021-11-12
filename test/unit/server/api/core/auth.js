const utils = require('../../../../assets/utils');
describe(utils.suiteName(__filename), function() {
    const Auth = utils.reqSrc('./api/core/auth');
    const P = Auth.Permission;
    const Errors = utils.reqSrc('./api/core/errors');

    before(() => utils.reset());
    beforeEach(() => Auth.enable());

    it('should ensure users cannot view others', async function() {
        await utils.shouldThrow(
            () => Auth.ensureAuthorized('brian', P.User.READ('hamid')),
            Errors.Unauthorized
        );
    });

    it('should ensure users cannot edit others', async function() {
        await utils.shouldThrow(
            () => Auth.ensureAuthorized('brian', P.User.WRITE('hamid')),
            Errors.Unauthorized
        );
    });

    it('should ignore auth if disabled', async function() {
        Auth.disable();
        await Auth.ensureAuthorized('brian', P.User.WRITE('hamid'));
        Auth.enable();
    });

    it('should allow group owner to edit members', async function() {
        await Auth.ensureAuthorized('brian', P.User.WRITE('groupMember'));
    });

    it('should allow group owner to view members', async function() {
        await Auth.ensureAuthorized('brian', P.User.READ('groupMember'));
    });
});
