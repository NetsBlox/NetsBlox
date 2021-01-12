const utils = require('../../../../assets/utils');

describe.only(utils.suiteName(__filename), function() {
    const assert = require('assert').strict;
    const OAuthAPI = utils.reqSrc('./api/core/oauth');
    const Errors = utils.reqSrc('./api/core/errors');

    before(async () => {
        await utils.reset();
    });

    describe('createClient', function() {
        it('should be able to create/get OAuth clients', async function() {
            const id = await OAuthAPI.createClient('brian', 'My Test App');
            const client = await OAuthAPI.getClient(id);
            assert.equal(client._id.toString(), id.toString());
        });
    });

    describe('authorization', function() {
        let username = 'brian',
            redirectUri = 'http://localhost/test',
            clientId;

        before(async () => {
            clientId = await OAuthAPI.createClient(username, 'authorizeClient test');
        });

        it('should be able to authorize OAuth client', async function() {
            const authCode = await OAuthAPI.authorizeClient(username, clientId, redirectUri);
            assert(authCode);
        });

        describe('access token', function() {
            let authCode;
            before(async () => {
                authCode = await OAuthAPI.authorizeClient(username, clientId, redirectUri);
            });

            it('should be able to fetch access token', async function() {
                const token = await OAuthAPI.createToken(authCode, redirectUri);
                assert(token);
            });
        });
    });
});
