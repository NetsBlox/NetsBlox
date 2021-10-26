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
    const member = 'memberUser';
    const {hex_sha512} = utils.reqSrc('../common/sha512');
    const sinon = require('sinon');
    const Strategies = utils.reqSrc('api/core/strategies');
    const {Strategy} = Strategies;
    const NetworkTopology = utils.reqSrc('network-topology');

    before(async () => {
        await utils.reset(
            //new f.User(username),
            //new f.User('otherUser'),
            //new f.Group(username, 'SomeGroup'),
            //new f.User(member, null, 'SomeGroup'),
        );
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

    describe('delete', function() {
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
        it('should change user password', async function() {
            await UsersAPI.setPassword(username, username, 'newPassword');
            const user = await UsersStorage.collection.findOne({username});
            assert.equal(user.hash, hex_sha512('newPassword'));
        });

        it('should not change different user password', async function() {
            await assert.rejects(
                () => UsersAPI.setPassword('someUser', username, 'newPassword'),
                /is not allowed to edit user/
            );
        });

        it('should change member password', async function() {
            await assert.rejects(
                () => UsersAPI.setPassword(username, member, 'newPassword'),
            );  // TODO
        });
    });

    describe('resetPassword', function() {
        const mailer = {
            sendMail: sinon.spy(),
        };

        it('should change user password', async function() {
            const {hash: password} = await UsersStorage.collection.findOne({username});
            await UsersAPI.resetPassword(username, mailer);
            const {hash: newPassword} = await UsersStorage.collection.findOne({username});
            assert.notEqual(password, newPassword);
        });

        it('should throw error if user not found', async function() {
            await assert.rejects(
                () => UsersAPI.resetPassword('nonExistingUser', mailer),
                /Could not find user/
            );
        });

        it('should email user new password', async function() {
            await UsersAPI.resetPassword(username, mailer);
            assert(mailer.sendMail.calledOnce);
            const [mailData] = mailer.sendMail.args;
            assert.equal(mailData.to, `${username}@netsblox.org`);
            assert.equal(mailData.subject, 'Temporary Password');
        });
    });

    describe('linkAccount', function() {
        let strategy;
        before(() => {
            strategy = new Strategy('Test');
            Strategies.contents.push(strategy);
        });

        after(() => {
            Strategies.contents.pop();
        });

        it('should register the new auth strategy', async function() {
            const snapUser = 'brollb';
            const {linkedAccounts} = await UsersStorage.collection.findOne({username});
            await UsersAPI.linkAccount(username, strategy, snapUser, 'somePassword');
            const {linkedAccounts: newAccounts} = await UsersStorage.collection.findOne({username});
            assert.equal(newAccounts.length, linkedAccounts.length + 1);
            assert(newAccounts.find(acct => acct.username === snapUser));
        });

        it('should authenticate w/ the strategy', async function() {
            strategy.authenticate = sinon.spy();
            const snapUser = 'brollb2';
            await UsersAPI.linkAccount(username, strategy, snapUser, 'somePassword');
            assert(strategy.authenticate.calledOnce);
        });

        describe('unlinkAccount', function() {
            let linkedAccount;

            before(async () => {
                linkedAccount = {username, type: strategy.type};
                const linkedAccounts = [linkedAccount];
                await UsersStorage.collection.updateOne({username}, {$set: {linkedAccounts}});
            });

            it('should remove the auth strategy', async function() {
                await UsersAPI.unlinkAccount(username, username, linkedAccount);
                const {linkedAccounts} = await UsersStorage.collection.findOne({username});
                assert.equal(linkedAccounts.length, 0);
            });
        });
    });

    describe('login', function() {
        it('should log user in', async function() {
            await UsersAPI.login(username, 'secretPassword');
        });

        it('should throw error if user/password incorrect', async function() {
            await assert.rejects(
                UsersAPI.login(username, 'incorrectPassword'),
                /Incorrect username or password/
            );
        });

        it('should throw error if user not found', async function() {
            await assert.rejects(
                UsersAPI.login('nonExistent', 'incorrectPassword'),
                /Incorrect username or password/
            );
        });

        describe('if client provided', function() {
            let clientId, count = 0, projectName;

            beforeEach(async () => {
                clientId = `_netsblox_login_tests_${count}`;
                projectName = `login-tests-${++count}`;
                await utils.createRoom({
                    name: projectName,
                    owner: clientId,
                    roles: {
                        role: [clientId]
                    }
                });
            });

            it('should set username for client', async function() {
                await UsersAPI.login(username, 'secretPassword', null, clientId);
                const client = NetworkTopology.getClient(clientId);
                assert.equal(client.username, username);
            });

            it('should update owner of project for client', async function() {
                await UsersAPI.login(username, 'secretPassword', null, clientId);
                const project = await ProjectsStorage._collection.findOne({name: projectName});
                assert.equal(project.owner, username);
            });
        });
    });

    describe('logout', function() {
        it('should update the owner of project for client', function() {
            // TODO
        });

        it('should update the client username', function() {
            // TODO
        });
    });
});
