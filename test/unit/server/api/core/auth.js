describe('auth', function() {
    const utils = require('../../../../assets/utils');
    const Auth = utils.reqSrc('./api/core/auth');
    const P = Auth.Permission;
    const Errors = utils.reqSrc('./api/core/errors');

    beforeEach(() => Auth.enable());

    it('should ensure users cannot view others', async function() {
        await utils.shouldThrow(
            () => Auth.ensureAuthorized('brian', P.User.READ('hamid')),
            Errors.Unauthorized
        );
    });

    it('should ignore auth if disabled', async function() {
        Auth.disable();
        await Auth.ensureAuthorized('brian', P.User.WRITE('hamid'));
    });

    it.skip('should allow group owner to edit members', async function() {
        // TODO
        await Auth.ensureAuthorized('brian', P.User.WRITE('hamid'));
    });
});
