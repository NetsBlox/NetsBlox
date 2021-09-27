const utils = require('../../../../assets/utils');
describe(utils.suiteName(__filename), function() {
    const assert = require('assert');
    const utils = require('../../../../assets/utils');
    const UsersAPI = utils.reqSrc('./api/core/users');
    const Auth = utils.reqSrc('./api/core/auth');
    const UsersStorage = utils.reqSrc('./storage/users');
    const ProjectsStorage = utils.reqSrc('./storage/projects');
    const GroupsStorage = utils.reqSrc('./storage/groups');
    const username = 'brian';

    before(async () => {
        await utils.reset();
    });

    describe('create', function() {
        it('should create new user', async function() {
            const username = 'newUser2233';
            await UsersAPI.create(null, username, 'some@email.com', undefined, 'password');
            const user = await UsersStorage.collection.findOne({username});
            assert(user);
        });

        it('should fail if user exists', async function() {
            await assert.rejects(
                () => UsersAPI.create(null, username, 'some@email.com', undefined, 'password'),
                /already exists/
            );
        });

        it('should not allow usernames starting with _', async function() {
            await assert.rejects(
                () => UsersAPI.create(null, '_username', 'some@email.com', undefined, 'password'),
                /Invalid argument/
            );
        });

        describe('groups', function() {
            let groupId;
            before(async () => {
                const group = await GroupsStorage.new('testUsers', username);
                groupId = group.getId();
            });

            it('should be able to add users to own groups', async function() {
                await UsersAPI.create('brian', 'username43', 'some@email.com', groupId, 'password');
                const user = await UsersStorage.collection.findOne({username: 'username43'});
                assert(user);
            });

            it('should not be able to add users to other groups', async function() {
                await assert.rejects(
                    () => UsersAPI.create('', 'username44', 'some@email.com', groupId, 'password'),
                    /edit the requested group/
                );
            });
        });

        describe('dryrun', function() {
            it('should not create user', async function() {
                const username = 'newUser223344';
                await UsersAPI.create(null, username, 'some@email.com', undefined, 'password', true);
                const user = await UsersStorage.collection.findOne({username});
                assert(!user);
            });

            it('should throw error if user exists', async function() {
                const {username} = await UsersStorage.collection.findOne({});
                await assert.rejects(
                    () => UsersAPI.create(null, username, 'some@email.com', undefined, 'password', true),
                    /already exists/
                );
            });
        });
    });

    describe('view', function() {
        it('should view own user', async function() {
            const user = await UsersAPI.view(username, username);
            assert(user);
        });

        it('should not view other users', async function() {
            await assert.rejects(
                () => UsersAPI.view(null, username),
                /view user/
            );
        });

        it('should clean user', async function() {
            const user = await UsersAPI.view(username, username);
            assert(!user._id);
            assert(!user.hash);
        });

        it('should throw error if user doesnt exist', async function() {
            await assert.rejects(
                () => UsersAPI.view(null, username),
                /view user/
            );
        });
    });

    describe.only('delete', function() {
        beforeEach(() => Auth.disable());
        afterEach(() => Auth.enable());

        describe('success', function() {
            before(async () => {
                Auth.disable();
                await UsersAPI.delete(null, username);
            });

            it('should delete user', async function() {
                const user = await UsersStorage.collection.findOne({username});
                assert(!user);
            });

            it('should delete user\'s projects', async function() {
                const project = await ProjectsStorage._collection.findOne({owner: username});
                assert(!project);
            });
        });

        it('should throw error if doesnt exist', async function() {
            await assert.rejects(
                () => UsersAPI.delete(null, 'someUser'),
                /not find user/
            );
        });

        it('should not delete other user accounts', async function() {
            Auth.enable();
            await assert.rejects(
                () => UsersAPI.delete('otherUser', username),
                /not allowed/
            );
        });

        it('should allow own deletion', async function() {
            Auth.enable();
            await UsersAPI.delete(username, username);
        });

        it('should delete allow owner to delete member account', async function() {
            Auth.enable();
            //await UsersAPI.delete(owner, member);
        });
    });

    describe('setPassword', function() {
        it('should change user password', function() {
            await UsersAPI.setPassword(username, 'newPassword');
            // TODO
        });

        it('should not change different user password', function() {
            assert.rejects(
                () => UsersAPI.setPassword(username, 'wrongPassword', 'newPassword'),
                // TODO
            );
        });

        it('should change member password', function() {
            assert.rejects(
                () => UsersAPI.setPassword(owner, member, 'wrongPassword', 'newPassword'),
                // TODO
            );
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

        it('should email user new password', function(done) {
            const mockMailer = {};
            mockMailer.sendMail = data => {
                assert(data.html.includes(newPassword))
                done();
            };

            UsersAPI.resetPassword(username, newPassword, mockMailer);
            // TODO
        });
    });

    describe('linkAccount', function() {
        it('should register the new auth strategy', function() {
            // TODO
        });

        it('should throw error if strategy not found', function() {
            // TODO
        });
    });

    describe('unlinkAccount', function() {
        it('should remove the auth strategy', function() {
            // TODO
        });

        it('should throw error if strategy not found', function() {
            // TODO
        });
    });

    describe('login', function() {
        it('should log user in', function() {
            // TODO
        });

        it('should throw error if password incorrect', function() {
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
