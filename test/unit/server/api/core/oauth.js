const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
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

        it('should throw error if invalid client', async function() {
            await utils.shouldThrow(
                () => OAuthAPI.authorizeClient(username, 'invalid', redirectUri),
                Errors.OAuthClientNotFound,
            );
        });

        describe('access token', function() {
            let authCode;
            before(async () => {
                authCode = await OAuthAPI.authorizeClient(username, clientId, redirectUri);
            });

            it('should be able to create access token', async function() {
                const token = await OAuthAPI.createToken(authCode, redirectUri);
                assert(token);
            });

            it('should throw error if redirect URI doesnt match', async function() {
                await utils.shouldThrow(
                    () => OAuthAPI.createToken(authCode, 'http://localhost'),
                    Errors.InvalidRedirectURL 
                );
            });

            it('should throw error if invalid auth code', async function() {
                await utils.shouldThrow(
                    () => OAuthAPI.createToken('invalid', redirectUri),
                    Errors.InvalidAuthorizationCode,
                );
            });

            describe('retrieval', function() {
                let tokenID;
                before(async () => {
                    tokenID = await OAuthAPI.createToken(authCode, redirectUri);
                });

                it('should be able to retrieve a token based on ID', async function() {
                    const token = await OAuthAPI.getToken(tokenID);
                    assert(token);
                });

                it('should throw error if invalid token', async function() {
                    await utils.shouldThrow(
                        () => OAuthAPI.getToken('invalid'),
                        Errors.InvalidOAuthToken,
                    );
                });
            });
        });
    });
});
