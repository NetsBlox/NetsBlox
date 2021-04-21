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

        it('should not be able to add users to other groups', async function() {
            // TODO
        });
    });

    describe('cancelAccount', function() {
        it('should delete user', function() {
            // TODO
        });

        it('should delete user\'s projects', function() {
            // TODO
        });

        it('should not delete other user accounts', function() {
            // TODO
        });

        it('should delete member account', function() {
            // TODO
        });
    });

    describe('setPassword', function() {
        it('should change user password', function() {
            // TODO
        });

        it('should not change different user password', function() {
            // TODO
        });

        it('should change member password', function() {
            // TODO
        });
    });

    describe('resetPassword', function() {
        it('should change user password', function() {
            // TODO
        });

        it('should not change different user password', function() {
            // TODO
        });

        it('should change member password', function() {
            // TODO
        });

        it('should email user new password', function() {
            // TODO
        });
    });

    describe('logout', function() {
        it('should clear the users token', function() {
            // TODO
        });

        it('should update the associated client', function() {
            // TODO
        });
    });
});
