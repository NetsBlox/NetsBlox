const utils = require('../../../../assets/utils');
describe(utils.suiteName(__filename), function() {
    const assert = require('assert');
    const utils = require('../../../../assets/utils');
    const UsersAPI = utils.reqSrc('./api/core/users');
    const UsersStorage = utils.reqSrc('./storage/users');
    const username = 'brian';

    before(async () => {
        await utils.reset();
    });

    describe('create', function() {
        it('should create new user', async function() {
            const username = 'newUser2233';
            await UsersAPI.create(username, 'some@email.com', undefined, 'password');
            const user = await UsersStorage.collection.findOne({username});
            assert(user);
        });

        it('should fail if user exists', async function() {
            assert.rejects(
                () => UsersAPI.create(username, 'some@email.com', undefined, 'password'),
                /already exists/
            );
        });

        it('should not allow usernames starting with _', async function() {
            assert.rejects(
                () => UsersAPI.create('_username', 'some@email.com', undefined, 'password'),
                /Invalid argument/
            );
        });
    });
});
